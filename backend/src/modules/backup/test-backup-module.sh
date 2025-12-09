#!/bin/bash

API="http://localhost:4000/api"
AUTH="Authorization: Bearer <TOKEN>"

echo "=============================="
echo "1) Create Storage Config"
echo "=============================="

CREATE_SC=$(curl -s -X POST "$API/storage-configs" \
  -H "$AUTH" \
  -H "Content-Type: application/json" \
  -d '{
        "name": "Local Test",
        "provider": "local",
        "config": { "localPath": "/tmp/backups" }
      }')

echo "$CREATE_SC"

SC_ID=$(echo "$CREATE_SC" | jq -r '.data.id')

echo ""
echo "Storage Config ID: $SC_ID"
echo ""


echo "=============================="
echo "2) Test Storage Config"
echo "=============================="

curl -s -X POST "$API/storage-configs/test" \
  -H "$AUTH" \
  -H "Content-Type: application/json" \
  -d "{
        \"provider\": \"local\",
        \"config\": { \"localPath\": \"/tmp/backups\" }
      }"

echo ""
echo ""


echo "=============================="
echo "3) Create Backup Job"
echo "=============================="

CREATE_BKP=$(curl -s -X POST "$API/backups" \
  -H "$AUTH" \
  -H "Content-Type: application/json" \
  -d "{
        \"type\": \"files\",
        \"name\": \"test-backup\",
        \"storageConfigId\": $SC_ID,
        \"files\": [{ \"path\": \"/etc\", \"alias\": \"etc\" }]
      }")

echo "$CREATE_BKP"

BKP_ID=$(echo "$CREATE_BKP" | jq -r '.data.id')

echo ""
echo "Backup ID: $BKP_ID"
echo ""


echo "=============================="
echo "4) Wait 5 seconds for worker"
echo "=============================="

sleep 5


echo "=============================="
echo "5) Get Backup Status"
echo "=============================="

curl -s -X GET "$API/backups/$BKP_ID" -H "$AUTH"
echo ""
echo ""


echo "=============================="
echo "6) Download Backup"
echo "=============================="

curl -s -X GET "$API/backups/$BKP_ID/download" \
  -H "$AUTH" \
  -o "backup-$BKP_ID.tar.gz"

echo "Downloaded: backup-$BKP_ID.tar.gz"
echo ""


echo "=============================="
echo "7) Test Restore (ADMIN ONLY)"
echo "=============================="

curl -s -X POST "$API/backups/$BKP_ID/restore" \
  -H "$AUTH" \
  -H "Content-Type: application/json" \
  -d '{
        "restoreDb": false,
        "restoreFiles": true,
        "destination": "/tmp/restore-test"
      }'

echo ""
echo ""


echo "=============================="
echo "8) Done!"
echo "=============================="
