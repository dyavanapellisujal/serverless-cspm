import requests
import os
from typing import Dict, Any, Optional

# --- Configuration ---
# Use environment variable for OPA server IP, fallback to public IP
OPA_SERVER_IP = os.environ.get('OPA_SERVER_IP', '13.127.112.150') # Fallback if env var is missing
OPA_PORT = os.environ.get('OPA_PORT', '8181')

OPA_URL_SSE = f"http://{OPA_SERVER_IP}:{OPA_PORT}/v1/data/aws/s3_creation/deny"
OPA_URL_KMS = f"http://{OPA_SERVER_IP}:{OPA_PORT}/v1/data/aws/s3_kms_audit/deny"

def send_opa_request(bucket_config: Dict[str, Any], use_kms_endpoint: bool = False) -> Optional[Dict[str, Any]]:
    """
    Sends a request to OPA with the bucket configuration and returns the response.
    
    Args:
        bucket_config: Dictionary containing S3 bucket security configuration
        use_kms_endpoint: If True, uses KMS audit endpoint; otherwise uses SSE endpoint
        
    Returns:
        OPA response data or None if request fails
    """
    # Choose the appropriate OPA endpoint based on encryption type
    opa_url = OPA_URL_KMS if use_kms_endpoint else OPA_URL_SSE
    endpoint_type = "KMS" if use_kms_endpoint else "SSE"
    
    input_data = {
        "input": {
            "resource_type": "s3",
            "bucket_config": bucket_config
        }
    }
    
    try:
        print(f"[DEBUG] Preparing to query OPA ({endpoint_type} endpoint)...")
        print(f"[DEBUG] >> OPA Server IP: {OPA_SERVER_IP}")
        print(f"[DEBUG] >> OPA URL: {opa_url}")
        print(f"[DEBUG] >> OPA Input Payload: {input_data}")
        
        opa_response = requests.post(
            url=opa_url,
            json=input_data,
            timeout=10
        )

        print(f"[DEBUG] >> OPA Response Status Code: {opa_response.status_code}")
        print(f"[DEBUG] >> OPA Raw Response Text: {opa_response.text}")
        
        opa_response.raise_for_status()
        response_data = opa_response.json()
        return response_data
        
    except requests.exceptions.RequestException as e:
        print(f"[ERROR] OPA request failed. Reason: {e}")
        return None
    except requests.exceptions.JSONDecodeError as e:
        print(f"[ERROR] Could not decode JSON from OPA response. Reason: {e}")
        return None

def parse_opa_response(response_data: Dict[str, Any]) -> Optional[Dict[str, str]]:
    """
    Parses OPA response and extracts finding details.
    
    Args:
        response_data: Raw OPA response data
        
    Returns:
        Dictionary with risk_level and reason, or None if no findings
    """
    print("[DEBUG] Parsing OPA response...")
    result = response_data.get("result", {})
    print(f"[DEBUG] >> Parsed 'result' field: {result}")

    # Handle both dictionary and list formats from OPA
    finding_details = None
    if isinstance(result, dict) and result:
        # Direct dictionary format: {"result": {"reason": "...", "risk_level": "..."}}
        finding_details = result
        print("[DEBUG] >> Using dictionary format result")
    elif isinstance(result, list) and result:
        # List format: {"result": [{"reason": "...", "risk_level": "..."}]}
        finding_details = result[0]
        print("[DEBUG] >> Using list format result")
    else:
        print("[INFO] No findings from OPA. Bucket is compliant.")
        return None
    
    risk = finding_details.get("risk_level", "High")
    reason = finding_details.get("reason", "No reason provided.")
    print(f"[DEBUG] >> Extracted Risk='{risk}', Reason='{reason}'")
    
    # Handle specific OPA results
    if "Unrecognized" in risk:
        risk = "Critical"
    
    if risk == "Public":
        print("[INFO] Bucket is public, escalated to CRITICAL finding.")
        risk = "Critical"
        
    return {
        "risk_level": risk,
        "reason": reason
    }