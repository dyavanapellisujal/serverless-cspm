package aws.kms_key

import rego.v1

# Rule for KMS keys with critical security issues
deny contains {"risk_level": "Critical", "reason": reason} if {
    input.resource_type == "kms"
    critical_issues := get_critical_kms_issues(input.kms_config)
    count(critical_issues) > 0
    reason := sprintf("KMS key has critical security issues: %v", [concat(", ", critical_issues)])
}

# Rule for KMS keys with high security issues
deny contains {"risk_level": "High", "reason": reason} if {
    input.resource_type == "kms"
    high_issues := get_high_kms_issues(input.kms_config)
    count(high_issues) > 0
    has_critical_issues(input.kms_config) == false
    reason := sprintf("KMS key has high security issues: %v", [concat(", ", high_issues)])
}

# Rule for KMS keys with medium security issues
deny contains {"risk_level": "Medium", "reason": reason} if {
    input.resource_type == "kms"
    medium_issues := get_medium_kms_issues(input.kms_config)
    count(medium_issues) > 0
    has_critical_issues(input.kms_config) == false
    has_high_issues(input.kms_config) == false
    reason := sprintf("KMS key has medium security issues: %v", [concat(", ", medium_issues)])
}

# Rule for KMS keys with low security issues
deny contains {"risk_level": "Low", "reason": reason} if {
    input.resource_type == "kms"
    low_issues := get_low_kms_issues(input.kms_config)
    count(low_issues) > 0
    has_critical_issues(input.kms_config) == false
    has_high_issues(input.kms_config) == false
    has_medium_issues(input.kms_config) == false
    reason := sprintf("KMS key has low security issues: %v", [concat(", ", low_issues)])
}

# Rule for KMS keys with high confidentiality but weak security
deny contains {"risk_level": "Critical", "reason": "KMS key marked as high confidentiality but has security weaknesses"} if {
    input.resource_type == "kms"
    has_confidentiality_tag(input.kms_config.tags)
    confidentiality := get_confidentiality_level(input.kms_config.tags)
    confidentiality == "high"
    security_issues := array.concat(
        get_critical_kms_issues(input.kms_config),
        get_high_kms_issues(input.kms_config)
    )
    count(security_issues) > 0
}

# Rule for Customer managed keys with AWS managed key characteristics
deny contains {"risk_level": "Medium", "reason": "Customer managed key configured with AWS managed key characteristics"} if {
    input.resource_type == "kms"
    input.kms_config.key_manager == "CUSTOMER"
    input.kms_config.origin == "AWS_KMS"
    input.kms_config.key_rotation_enabled == false
    count(input.kms_config.aliases) == 0
}

# Rule for external key material without proper controls
deny contains {"risk_level": "High", "reason": "External key material used without adequate security controls"} if {
    input.resource_type == "kms"
    input.kms_config.origin == "EXTERNAL"
    has_external_key_controls(input.kms_config) == false
}

# Helper functions
get_critical_kms_issues(config) := issues if {
    potential_issues := [
        {"condition": config.key_state != "Enabled", "issue": "key not enabled"},
        {"condition": config.key_manager != "CUSTOMER", "issue": "not customer managed key"},
        {"condition": has_overly_permissive_policy(config.key_policy), "issue": "overly permissive key policy"},
        {"condition": config.origin == "EXTERNAL", "issue": "external key material without proper controls"}
    ]
    issues := [issue.issue | issue := potential_issues[_]; issue.condition]
}

get_high_kms_issues(config) := issues if {
    potential_issues := [
        {"condition": config.key_rotation_enabled == false, "issue": "key rotation disabled"},
        {"condition": has_excessive_grants(config.grants), "issue": "excessive key grants"},
        {"condition": has_proper_tagging(config.tags) == false, "issue": "missing security tags"},
        {"condition": config.deletion_date != null, "issue": "key scheduled for deletion"}
    ]
    issues := [issue.issue | issue := potential_issues[_]; issue.condition]
}

get_medium_kms_issues(config) := issues if {
    potential_issues := [
        {"condition": count(config.aliases) == 0, "issue": "no key aliases defined"},
        {"condition": config.key_usage != "ENCRYPT_DECRYPT", "issue": "non-standard key usage"},
        {"condition": config.key_spec != "SYMMETRIC_DEFAULT", "issue": "non-standard key specification"},
        {"condition": config.multi_region == true, "issue": "multi-region key requires additional controls"}
    ]
    issues := [issue.issue | issue := potential_issues[_]; issue.condition]
}

get_low_kms_issues(config) := issues if {
    potential_issues := [
        {"condition": count(config.tags) < 3, "issue": "insufficient tagging"},
        {"condition": count(config.grants) > 0, "issue": "active grants present"},
        {"condition": count(config.replica_keys) > 5, "issue": "excessive replica keys"}
    ]
    issues := [issue.issue | issue := potential_issues[_]; issue.condition]
}

has_critical_issues(config) if {
    critical_issues := get_critical_kms_issues(config)
    count(critical_issues) > 0
}

has_high_issues(config) if {
    high_issues := get_high_kms_issues(config)
    count(high_issues) > 0
}

has_medium_issues(config) if {
    medium_issues := get_medium_kms_issues(config)
    count(medium_issues) > 0
}

has_overly_permissive_policy(policy) if {
    policy != null
    stmt := policy.Statement[_]
    stmt.Effect == "Allow"
    stmt.Principal == "*"
    has_condition_restrictions(stmt) == false
}

has_condition_restrictions(stmt) if {
    stmt.Condition
    count(stmt.Condition) > 0
}

has_excessive_grants(grants) if {
    count(grants) > 10
}

has_excessive_grants(grants) if {
    g := grants[_]
    "*" in g.operations
}

has_proper_tagging(tags) if {
    required_tags := ["Environment", "Owner", "Purpose"]
    tag_keys := [tg.Key | tg := tags[_]]
    count([req_tag | req_tag := required_tags[_]; req_tag in tag_keys]) >= 2
}

has_confidentiality_tag(tags) if {
    t := tags[_]
    t.Key == "Confidentiality"
}

get_confidentiality_level(tags) := level if {
    tag_item := tags[_]
    tag_item.Key == "Confidentiality"
    level := lower(tag_item.Value)
}

has_external_key_controls(config) if {
    has_proper_tagging(config.tags)
    config.key_state == "Enabled"
    count(config.grants) < 5
}