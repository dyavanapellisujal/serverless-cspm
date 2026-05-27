# 🛡️ Serverless CSPM (Cloud Security Posture Management)

A high-performance, real-time security intelligence platform designed to identify, visualize, and remediate AWS infrastructure misconfigurations (S3, EC2, KMS).

---

## 🌟 Key Features
*   **Real-Time Event-Driven Auditing:** Triggered by AWS CloudWatch/EventBridge for instant risk detection.
*   **Dual-Audit Logic (Cross-Service):** Correlates S3 bucket security with the underlying KMS Key policies.
*   **OPA-Powered Engine:** Uses Open Policy Agent (Rego) for cloud-native compliance checks.
*   **Active Remediation Control:** One-click secure deletion/termination of non-compliant resources directly from the dashboard.
*   **Automated Forensics:** Generates professional PDF reports with full incident timelines.
*   **Interactive Dashboard:** A modern, glassmorphic UI with real-time security posture trending.

---

## 🏗 System Architecture
The platform follows a highly scalable, serverless event-driven architecture:

1.  **Detection Layer:** EventBridge captures resource changes (e.g., `CreateBucket`, `AuthorizeSecurityGroupIngress`).
2.  **Audit Layer:** AWS Lambda functions execute specialized Python auditors (`S3Audit`, `KMSAudit`) using **OPA policies**.
3.  **Storage Layer:** Findings are stored globally in **MongoDB Atlas**.
4.  **Presentation Layer:** A **React + Vite** dashboard pulls intelligence from a **Flask API** backend.

---

## 🛠 Tech Stack
*   **Infrastructure:** Terraform, AWS Lambda, EventBridge, SQS.
*   **Backend:** Python (Flask), PyMongo, Open Policy Agent (Rego).
*   **Frontend:** React, Material UI (MUI), Recharts, Vite.
*   **Database:** MongoDB Atlas (Cloud).

---

## 🚀 Quick Setup

### 1. Database Configuration
*   Create a Cluster on **MongoDB Atlas**.
*   In **Network Access**, whitelist your IP and AWS Lambda (or `0.0.0.0/0` for testing).
*   Create a `.env` file in the root directory with:
    ```env
    MONGODB_URI="your_connection_string"
    DATABASE_NAME="csmp_findings"
    ```

### 2. AWS Resource Deployment
*   Navigate to `real_time_monitoring/aws/terraform`.
*   Update `terraform.tfvars` with your MongoDB URI.
*   Run:
    ```bash
    terraform init
    terraform apply
    ```

### 3. Start the Dashboard
*   Click **`run.bat`** in the root folder, OR run:
    ```powershell
    ./start_project.ps1
    ```

---

## 🧪 Demonstration & Test Cases
The project includes a specialized test guide at [testcase.md](./testcase.md).

### Standard 6-Stage Demo sequence:
1.  **Public S3 Exposure:** Detection of unblocked public access.
2.  **Encryption Violation:** Catching unencrypted S3 buckets.
3.  **Network Entry Point:** Identifying unrestricted SSH (0.0.0.0/0).
4.  **KMS Deep-Audit:** Finding insecure Key Policies linked to private buckets.
5.  **Active Dashboard Remediation:** One-click secure resource deletion with "DELETE" confirmation safeguard.
6.  **Incident Reporting:** One-button PDF generation for compliance audits.

---

## 🧹 Maintenance & Security
*   **Reset Dashboard:** To clear all findings before a demo, run `python clear_db.py`.
*   **Security Guard:** Sensitive credentials (`.env`, `*.tfvars`) are protected via `.gitignore` and are not tracked in the repository history.

---
*Developed for advanced cloud security automation and real-time posture awareness.*
