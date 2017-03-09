#! /bin/bash

# Usage:
# set.sh <storage_acount_name> <storage_account_key> <api_endpoint_suffix> <influx_username> <influx_password> 

sudo apt-get -y update
sudo apt-get -y upgrade
sudo apt-get -y dist-upgrade
sudo apt-get -y autoremove

#### Collectd ####
sudo apt-get install -y collectd
#TOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOODO: DOWNLOAD CONF FILE
cd ~/Conf/collectd
sudo sed -i "s/INFLUX_UDP_USERNAME/$4/g" collectd.conf
sudo sed -i "s/INFLUX_UDP_PASSWORD/$5/g" collectd.conf
sudo mv collectd.conf /etc/collectd
sudo service collectd restart


cd ~
#sudo mv collectd.conf /etc/collectd/
sudo service collectd stop

#### Node.js server for Portal ####
sudo apt-get install -y npm nodejs
sudo ln -s /usr/bin/nodejs /usr/bin/node
sudo npm install supervisor -g


#### Fire wall ####
sudo iptables -I INPUT -p tcp --dport 3000 -j ACCEPT #Grafana Web
sudo iptables -I INPUT -p tcp --dport 8080 -j ACCEPT #Portal Web
sudo iptables -I INPUT -p udp --dport 25826 -j ACCEPT #InfluxDB UDP
sudo iptables -I INPUT -p tcp --dport 25826 -j ACCEPT #InfluxDB UDP

#### influxDB
cd ~
wget https://dl.influxdata.com/influxdb/releases/influxdb_1.2.0_amd64.deb
sudo dpkg -i influxdb_1.2.0_amd64.deb
#TOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOODO: DOWNLOAD CONF FILE
cd ~/Conf/influxdb
sudo echo "$4:$5" > auth_file
sudo mv auth_file /etc/collectd
sudo mv influxdb.conf /etc/influxdb
sudo service influxdb restart
cd ~
curl -XPOST "http://localhost:8086/query" --data-urlencode "q=CREATE DATABASE cv"

#### Grafana ####
wget https://grafanarel.s3.amazonaws.com/builds/grafana_4.1.2-1486989747_amd64.deb
sudo dpkg -i grafana_4.1.2-1486989747_amd64.deb
sudo apt-get -f install
sudo grafana-cli plugins install jdbranham-diagram-panel
sudo service grafana-server restart

#TOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOODO: SET GRAFANA as auto - start service
#TOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOODO: Download Portal web, start by run.sh, add into auto-start
cd ~/Portal
npm install
cd ~/Portal/routes
sudo sed -i "s/STORAGE_ACCOUNT_NAME/$1/g" config.js
sudo sed -i "s/STORAGE_ACCOUNT_KEY/$2/g" config.js
sudo sed -i "s/API_ENDPOINT_SUFFIX/$3/g" config.js
cd ~/Portal
export NODE_TLS_REJECT_UNAUTHORIZED=0
bash run.sh

