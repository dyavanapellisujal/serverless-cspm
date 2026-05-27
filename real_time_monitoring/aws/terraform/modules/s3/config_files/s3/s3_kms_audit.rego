package aws.s3_kms_audit

import rego.v1

# Rule for S3 buckets using KMS encryption with security issues
deny contains {"risk_level": risk, "reason": reason} if {
    input.resource_type == "s3"
    is_kms_encrypted(input.bucket_config.encryption)
    
    # Check for various KMS-related security issues
    issues := get_kms_security_issues(input.bucket_config)
    count(issues) > 0
    
    risk := determine_kms_risk_level(issues)
    reason := sprintf("S3 bucket with KMS encryption has security issues: %v", [concat(", ", issues)])
}

# Rule for S3 buckets with KMS encryption but missing confidentiality context
deny contains {"risk_level": "Critical", "reason": "S3 bucket uses KMS encryption but lacks proper confidentiality tagging"} if {
    input.resource_type == "s3"
    is_kms_encrypted(input.bucket_config.encryption)
    has_confidentiality_tag(input.bucket_config.tagset) == false
}

# Rule for S3 buckets with KMS encryption and public access
deny contains {"risk_level": "Critical", "reason": "S3 bucket with KMS encryption allows public access"} if {
    input.resource_type == "s3"
    is_kms_encrypted(input.bucket_config.encryption)
    is_bucket_publicly_accessible(input.bucket_config)
}

# Rule for S3 buckets with KMS encryption but no versioning
deny contains {"risk_level": "Medium", "reason": "S3 bucket with KMS encryption should have versioning enabled for data protection"} if {
    input.resource_type == "s3"
    is_kms_encrypted(input.bucket_config.encryption)
    input.bucket_config.versioning.status != "Enabled"
}

# Rule for S3 buckets with KMS encryption but no access logging
deny contains {"risk_level": "Medium", "reason": "S3 bucket with KMS encryption should have access logging enabled for audit trails"} if {
    input.resource_type == "s3"
    is_kms_encrypted(input.bucket_config.encryption)
    input.bucket_config.logging.status == "disabled"
}

# Rule for specific KMS key security issues
deny contains {"risk_level": "Critical", "reason": "S3 bucket uses KMS key with security vulnerabilities"} if {
    input.resource_type == "s3"
    is_kms_encrypted(input.bucket_config.encryption)
    input.bucket_config.encryption.kms_security_status == "insecure kms key"
}

# Helper function to check if bucket uses KMS encryption
is_kms_encrypted(encryption_config) if {
    encryption_config.sse_algorithm == "aws:kms"
}

# Helper function to get KMS-specific security issues
get_kms_security_issues(config) := issues if {
    potential_issues := [
        {"condition": is_bucket_publicly_accessible(config), "issue": "public access enabled"},
        {"condition": config.versioning.status != "Enabled", "issue": "versioning disabled"},
        {"condition": config.logging.status == "disabled", "issue": "access logging disabled"},
        {"condition": config.versioning.mfa_delete != "Enabled", "issue": "MFA delete not enabled"},
        {"condition": has_confidentiality_tag(config.tagset) == false, "issue": "missing confidentiality tag"},
        {"condition": config.notification.status == "disabled", "issue": "event notifications disabled"}
    ]
    
    issues := [issue.issue | issue := potential_issues[_]; issue.condition]
}

# Helper function to determine risk level based on issues
determine_kms_risk_level(issues) := "Critical" if {
    critical_issues := ["public access enabled", "missing confidentiality tag"]
    count([issue | issue := issues[_]; issue == critical_issues[_]]) > 0
}

determine_kms_risk_level(issues) := "Medium" if {
    count(issues) >= 3
}

determine_kms_risk_level(issues) := "Low" if {
    count(issues) > 0
    count(issues) < 3
}

# Helper function to check if bucket is publicly accessible
is_bucket_publicly_accessible(config) if {
    config.public_access_block.block_public_acls == false
}

is_bucket_publicly_accessible(config) if {
    config.public_access_block.block_public_policy == false
}

is_bucket_publicly_accessible(config) if {
    config.public_access_block.ignore_public_acls == false
}

is_bucket_publicly_accessible(config) if {
    config.public_access_block.restrict_public_buckets == false
}

is_bucket_publicly_accessible(config) if {
    config.ownership.bucket_owner_enforced != true
}

# Helper function to check if Confidentiality tag is present
has_confidentiality_tag(tags) if {
    some i
    tags[i].Key == "Confidentiality"
}

# Helper function to extract KMS key ID from encryption config
get_kms_key_id(encryption_config) := key_id if {
    encryption_config.sse_algorithm == "aws:kms"
    key_id := encryption_config.kms_master_key_id
}