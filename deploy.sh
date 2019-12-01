#! /bin/bash

echo 'local deploy'
rm -rf /var/www/$1/{*,.*}
cp -R docs/* /var/www/$1/