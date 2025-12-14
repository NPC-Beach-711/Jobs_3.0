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
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.onload = () => {
      // reader.result looks like: "data:application/pdf;base64,JVBERi0xLjc..."
      const result = String(reader.result || "");
      const parts = result.split(",");
      if (parts.length < 2) return reject(new Error("Unexpected file encoding."));
      resolve(parts[1]); // base64 only
    };
    reader.readAsDataURL(file);
  });
}

async function submitToFlow(payload) {
  const resp = await fetch(FLOW_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-form-secret": FORM_SECRET
    },
    body: JSON.stringify(payload)
  });

  // Read response text for better debugging (Flow often returns plain text on failure)
  const text = await resp.text().catch(() => "");

  if (!resp.ok) {
    // Bubble up something useful
    throw new Error(`Flow error ${resp.status}: ${text || "No response body"}`);
  }

  return text;
}

function init() {
  const formEl = document.getElementById("appForm");
  if (!formEl) {
    console.error("appForm not found. Check index.html has <form id='appForm'>.");
    return;
  }

  formEl.addEventListener("submit", async (e) => {
    e.preventDefault();
    setStatus("");
    setSubmitting(true);

    try {
      // IMPORTANT: these must match your HTML input name="" attributes
      // Your HTML uses: name="name", name="email", name="phone", name="resume"
      const fullNameInput = formEl.elements["name"];
      const emailInput = formEl.elements["email"];
      const phoneInput = formEl.elements["phone"];
      const resumeInput = formEl.elements["resume"];

      if (!fullNameInput || !emailInput || !resumeInput) {
        throw new Error(
          "Form fields not found. Check your HTML input name attributes are: name, email, phone, resume."
        );
      }

      const fullName = String(fullNameInput.value || "").trim();
      const email = String(emailInput.value || "").trim();
      const phone = phoneInput ? String(phoneInput.value || "").trim() : "";

      const file = resumeInput.files && resumeInput.files[0] ? resumeInput.files[0] : null;

      if (!fullName) throw new Error("Name is required.");
      if (!email) throw new Error("Email is required.");
      if (!file) throw new Error("Resume is required.");

      // Optional client-side restrictions
      const allowedExt = [".pdf", ".doc", ".docx"];
      const lowerName = (file.name || "").toLowerCase();
      if (!allowedExt.some((ext) => lowerName.endsWith(ext))) {
        throw new Error("Resume must be a PDF, DOC, or DOCX file.");
      }

      const maxBytes = 8 * 1024 * 1024; // 8MB
      if (file.size > maxBytes) {
        throw new Error("Resume must be under 8MB.");
      }

      const resumeBase64 = await fileToBase64(file);

      // Payload keys must match your Power Automate trigger schema
      const payload = {
        email,                // Flow maps this -> SharePoint List Title
        fullName,             // Flow maps this -> SharePoint List Name
        phone,                // Flow maps this -> SharePoint List Phone
        resumeFileName: file.name,
        resumeBase64
      };

      await submitToFlow(payload);

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
