## swisseph-api

Swisseph API is an free and opensorce backend for getting Swisseph calculations online. 

## Installation

Clone project then run:

> npm install

to install all dependencies.

## Usage

To run the API server:

> npm start

Access to server by URL: http://localhost:3000.

## Status

Project is under development.


##
docker build -t swisseph-api:latest .

docker run -d --name swisseph-api -p 3000:3000 -e WECHAT_APP_ID=xxx -e WECHAT_APP_SECRET=xxx swisseph-api:latest