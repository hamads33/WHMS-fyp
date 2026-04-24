#!/bin/bash
node /home/memyselfandi/project/WHMS-fyp/backend/src/testso.js > /home/memyselfandi/project/WHMS-fyp/backend/testso_results.txt 2>&1
echo "exit_code=$?" >> /home/memyselfandi/project/WHMS-fyp/backend/testso_results.txt
