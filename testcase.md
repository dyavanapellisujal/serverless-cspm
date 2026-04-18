# 🛡️ Serverless CSPM: Comprehensive 6-Stage Demo Guide

Follow these 6 test cases to show the full lifecycle of your CSPM platform—from detection to remediation and reporting.

---

## 🛠 Prerequisites
1. **Reset the Dashboard:** Run `python d:\Projects\CSPM\serverless-cspm\clear_db.py`.
2. **Apply Final Logic:** Ensure you have run `terraform apply` recently to push the latest rules to AWS.

---

## 🛑 Test Case 1: The "Public Access" Crisis (S3 Exposure)
**Objective:** Prove the system detects intentional or accidental bucket exposure.

**Execution Steps (AWS Console):**
1. Navigate to **S3** -> **Create Bucket**.
2. Name: `cspm-critical-exposure-demo-123`.
3. In "Block Public Access settings", **UNCHECK** "Block all public access".
4. Acknowledge the warning (check the small box at the bottom).
5. Click **Create bucket**.

**Expected Outcome:**
* **Dashboard Alert:** A **CRITICAL/HIGH** severity finding appears within 15 seconds.
* **Alert Message:** "Cloud Security Alert: S3 Bucket Security Risk: Public access allowed via ACL or Policy."

---

## 🛡️ Test Case 2: The "Stealth" Violation (S3 Encryption Policy)
**Objective:** Show that the system enforces encryption standards, even if the bucket is "private."

**Execution Steps (AWS Console):**
1. Navigate to **S3** -> **Create Bucket**.
2. Name: `cspm-unencrypted-violation-test`.
3. Keep "Block all public access" **ON**.
4. Scroll to "Default encryption" and select **"Disable"**.
5. Click **Create bucket**.

**Expected Outcome:**
* **Dashboard Alert:** A **HIGH** severity finding appears.
* **Alert Message:** "Cloud Security Alert: Encryption Disabled. Data at rest is not protected by Server-Side Encryption (SSE)."

---

## 🌐 Test Case 3: The "Front Door" Breach (EC2 Security Group)
**Objective:** Demonstrate network security monitoring for unauthorized SSH access.

**Execution Steps (AWS Console):**
1. Navigate to **EC2** -> **Security Groups**.
2. Select any group and click **Edit Inbound Rules**.
3. Click **Add Rule** -> Set **Type:** `SSH` (Port 22) | **Source:** `0.0.0.0/0`.
4. Click **Save rules**.

**Expected Outcome:**
* **Dashboard Alert:** A **CRITICAL** (Red) alert appears immediately.
* **Alert Message:** "EC2 Security Group permits unrestricted SSH Access (Port 22 from 0.0.0.0/0)."

---

## 💎 Test Case 4: The "Deep Security" Audit (KMS Insecure Policy)
**Objective:** Prove "Cross-Layer" auditing by checking the encryption keys protecting your data.

**Execution Steps (AWS Console):**
1. Navigate to **KMS** -> **Customer managed keys** -> select `cspm-insecure-key`.
2. Go to **Key Policy** -> **Edit**.
3. Set **Principal** to `"*"` (Public Principal) and **Save**.
4. Create a **NEW S3 Bucket** -> Select **SSE-KMS** -> Choose this `cspm-insecure-key`.

**Expected Outcome:**
* **Dashboard Alert:** Two alerts appear. One for the S3 bucket and a standalone **CRITICAL** finding for the KMS Key.
* **Alert Message:** "KMS SECURITY ALERT: Linked encryption key permits Public Access (Principal: *). Data is exposed to decryption risk."

---

## 🔄 Test Case 5: The "Self-Cleaning" Dashboard (Remediation)
**Objective:** Demonstrate that the system intelligently tracks cleanup and "self-heals" the dashboard.

**Execution Steps (AWS Console):**
1. **Remediate S3:** Delete the test buckets you created (`DeleteBucket`).
2. **Remediate EC2:** Remove the `0.0.0.0/0` rule from your Security Group.
3. Observe the Dashboard "All Findings" list.

**Expected Outcome:**
* **Dashboard Behavior:** The active findings disappear from the main screen effortlessly.
* **System Logic:** Findings are archived into **Deleted Logs**, creating a closed-loop security posture.

---

## 📄 Test Case 6: Forensic Reporting & Accountability
**Objective:** Show that the platform provides professional, audit-ready documentation.

**Execution Steps (Dashboard):**
1. Navigate to the **"Reports"** tab on the left sidebar.
2. Find the report for your remediated S3 bucket or Security Group.
3. Click **Download PDF**.
4. Open the PDF to showcase the historical timeline.

**Expected Outcome:**
* **Document:** A polished PDF report showing the exact time of detection, the specific vulnerability, and the time of remediation.

---

**🎤 Final Presentation Message:**
*"Our Serverless CSPM platform gives you a 360-degree view of your security. It connects the dots between S3, EC2, and KMS to ensure your cloud is not just compliant, but genuinely secure."*
