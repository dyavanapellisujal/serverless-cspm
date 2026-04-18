import pymongo
import os
import json

# Connection Details from your Terraform config
MONGO_URI = "mongodb+srv://Adminuser:dbJayCSPM@cluster1.lnqotfu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1"

def clear_cspm_data():
    try:
        print("Connecting to MongoDB Atlas (Cluster 1)...")
        client = pymongo.MongoClient(MONGO_URI)
        db = client['csmp_findings']
        
        # Collections to clear
        collections = ['s3_audit_findings', 's3_audit_logs', 'reports', 'kms_security_findings']
        
        for coll_name in collections:
            count = db[coll_name].delete_many({}).deleted_count
            print(f"Cleared {count} records from '{coll_name}'")
            
        print("\n[SUCCESS] Dashboard is now fresh and empty! Ready for your demo.")
        client.close()
    except Exception as e:
        print(f"[ERROR] Could not clear database: {e}")

if __name__ == "__main__":
    clear_cspm_data()
