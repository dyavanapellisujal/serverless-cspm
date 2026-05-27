package aws.s3_creation

import rego.v1

# Main Rule: Flag if bucket is effectively public or has risky configuration
deny contains {"risk_level": risk, "reason": reason} if {
    input.resource_type == "s3"
    is_publicly_accessible(input.bucket_config)
    risk := "High"
    reason := "S3 Bucket Public Access Enabled (PublicAccessBlock is off)"
}

# Helper: Check if bucket is publicly accessible
is_publicly_accessible(config) if {
    # 1. Check if Public Access Block is NOT fully enabled
    config.public_access_block.status != "blocked"
}

# Allow if explicitly marked private via tags (optional override)
allow if {
    input.bucket_config.tagset[_].Key == "Classification"
    input.bucket_config.tagset[_].Value == "Private"
}
