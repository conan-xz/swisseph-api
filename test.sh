#!/bin/bash

# Birth Chart Generator Test
# Usage: ./test.sh [url]

SERVICE_URL="${1:-https://express-v2qc-140092-7-1342501112.sh.run.tcloudbase.com}"

node test-api.js "$SERVICE_URL"
