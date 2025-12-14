// VS CODE: paste your Power Automate URL here
const FLOW_URL = "https://46074bd623b7eb659325e9bd113c65.0f.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/bda71cf8487e4c298f99ce5c9134fed0/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=4qXzBpzzxtWIS-C4mRFd-Q6ZXx5WuCnu7MWujjHKXCk";

// VS CODE: basic shared secret (NOT truly secret in a public static site, but stops casual abuse)
// Better: rotate it occasionally + add extra checks in the flow.
const FORM_SECRET = "my-secret-123";

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const result = reader.result; // data:<mime>;base64,xxxx
      const base64 = String(result).split(",")[1];
      resolve(base64);
    };
    reader.readAsDataURL(file);
  });
}

document.getElementById("appForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const status = document.getElementById("status");
  const btn = document.getElementById("submitBtn");
  status.textContent = "";
  btn.disabled = true;

  try {
    const form = e.currentTarget;
    const fullName = form.fullName.value.trim();
    const email = form.email.value.trim();
    const phone = form.phone.value.trim();
    const notes = form.notes.value.trim();
    const file = form.resume.files[0];

    if (!file) throw new Error("Please attach a resume.");
    if (file.size > 8 * 1024 * 1024) throw new Error("Resume must be under 8MB.");

    const resumeBase64 = await fileToBase64(file);

    const payload = {
      fullName,
      email,
      phone,
      notes,
      resumeFileName: file.name,
      resumeMimeType: file.type || "application/octet-stream",
      resumeBase64
    };

    const resp = await fetch(FLOW_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-form-secret": FORM_SECRET
      },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`Submission failed (${resp.status}). ${text}`);
    }

    status.textContent = "Submitted successfully. Thank you!";
    form.reset();
  } catch (err) {
    status.textContent = err.message || "Something went wrong.";
  } finally {
    btn.disabled = false;
  }
});
