const FLOW_URL = "https://46074bd623b7eb659325e9bd113c65.0f.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/bda71cf8487e4c298f99ce5c9134fed0/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=4qXzBpzzxtWIS-C4mRFd-Q6ZXx5WuCnu7MWujjHKXCk";

const FORM_SECRET = "my-secret-123";


function setStatus(message) {
  const statusEl = document.getElementById("status");
  if (statusEl) statusEl.textContent = message || "";
}

function setSubmitting(isSubmitting) {
  const btn = document.getElementById("submitBtn");
  if (btn) btn.disabled = !!isSubmitting;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Failed to read the selected file."));
    reader.onload = () => {
      // reader.result: "data:<mime>;base64,AAAA..."
      const result = String(reader.result || "");
      const commaIndex = result.indexOf(",");
      if (commaIndex === -1) {
        reject(new Error("Unexpected file format while encoding."));
        return;
      }
      resolve(result.slice(commaIndex + 1)); // base64 only (no data: prefix)
    };

    reader.readAsDataURL(file);
  });
}

async function postToFlow(payload) {
  const resp = await fetch(FLOW_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-form-secret": FORM_SECRET
    },
    body: JSON.stringify(payload)
  });

  const text = await resp.text().catch(() => "");

  if (!resp.ok) {
    throw new Error(`Flow error ${resp.status}: ${text || "No response body"}`);
  }

  return text;
}

function init() {
  const formEl = document.getElementById("appForm");
  if (!formEl) {
    console.error("Form with id='appForm' not found.");
    return;
  }

  formEl.addEventListener("submit", async (e) => {
    e.preventDefault();
    setStatus("");
    setSubmitting(true);

    try {
      // These MUST match your HTML input name="" attributes
      const nameEl = formEl.elements["Name"];
      const emailEl = formEl.elements["email"];
      const phoneEl = formEl.elements["phone"];
      const resumeEl = formEl.elements["resume"];

      if (!nameEl || !emailEl || !resumeEl) {
        throw new Error(
          "Form fields missing. Confirm input names are: Name, email, phone, resume."
        );
      }

      const name = String(nameEl.value || "").trim();
      const email = String(emailEl.value || "").trim();
      const phone = phoneEl ? String(phoneEl.value || "").trim() : "";

      const file = resumeEl.files && resumeEl.files[0] ? resumeEl.files[0] : null;

      if (!name) throw new Error("Full name is required.");
      if (!email) throw new Error("Email is required.");
      if (!file) throw new Error("Please attach a resume.");

      // Optional: basic file validation
      const lower = (file.name || "").toLowerCase();
      const allowed = [".pdf", ".doc", ".docx"];
      if (!allowed.some((ext) => lower.endsWith(ext))) {
        throw new Error("Resume must be a PDF, DOC, or DOCX file.");
      }

      const maxBytes = 8 * 1024 * 1024; // 8MB
      if (file.size > maxBytes) {
        throw new Error("Resume must be under 8MB.");
      }

      const resumeBase64 = await fileToBase64(file);

      // Payload keys must match your Power Automate trigger schema
      const payload = {
        email,                 // Flow maps -> SharePoint Title
        name,              // Flow maps -> SharePoint Name
        phone,                 // Flow maps -> SharePoint Phone
        resumeFileName: file.name,
        resumeBase64
      };

      await postToFlow(payload);

      setStatus("Submitted successfully. Thank you!");
      formEl.reset();
    } catch (err) {
      console.error(err);
      setStatus(err && err.message ? err.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  });
}

document.addEventListener("DOMContentLoaded", init);
