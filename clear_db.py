import pymongo
import os
from dotenv import load_dotenv

# Load sensitive credentials from .env file
load_dotenv()

MONGO_URI = os.getenv('MONGODB_URI')
DATABASE_NAME = os.getenv('DATABASE_NAME', 'csmp_findings')

def clear_cspm_data():
    if not MONGO_URI:
        print("[ERROR] MONGODB_URI not found in .env file!")
        return

    try:
        print("Connecting to MongoDB Atlas securely...")
        client = pymongo.MongoClient(MONGO_URI)
        db = client[DATABASE_NAME]
        
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
