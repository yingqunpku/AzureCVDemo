#! /bin/bash

# Usage:
# set.sh <storage_acount_name> <storage_account_key> <api_endpoint_suffix> <influx_username> <influx_password> <influx_server> <node_name>

sudo apt-get -y update
sudo apt-get -y upgrade
sudo apt-get -y dist-upgrade
sudo apt-get -y autoremove

#### OPENCV: https://github.com/milq/code/blob/master/scripts/bash/install-opencv.sh ####
# INSTALL THE DEPENDENCIES
sudo apt-get install -y build-essential cmake # Build tools
sudo apt-get install -y zlib1g-dev libjpeg-dev libwebp-dev libpng-dev libtiff5-dev libjasper-dev libopenexr-dev libgdal-dev # Media I/O
sudo apt-get install -y libdc1394-22-dev libavcodec-dev libavformat-dev libswscale-dev libtheora-dev libvorbis-dev libxvidcore-dev libx264-dev yasm libopencore-amrnb-dev libopencore-amrwb-dev libv4l-dev libxine2-dev # Video I/O
sudo apt-get install -y libtbb-dev libeigen3-dev # Parallelism and linear algebra libraries
sudo apt-get install -y python-dev python-tk python-numpy python3-dev python3-tk python3-numpy python-pip # Python
sudo apt-get install -y ant default-jdk # Java
sudo apt-get install -y unzip wget # Tools
# Start build opencv
cd ~
wget https://github.com/opencv/opencv/archive/3.2.0.zip
unzip 3.2.0.zip
rm 3.2.0.zip
cd opencv-3.2.0
mkdir release
cd release
cmake -D CMAKE_BUILD_TYPE=RELEASE -D BUILD_EXAMPLES=ON -D CMAKE_INSTALL_PREFIX=/usr/local .. 
sudo make
sudo make install
sudo ldconfig

#### Python libraries for the Task processor ####
sudo apt-get -y install libffi6 libffi-dev libssl-dev
sudo pip install cryptography
sudo pip install imutils
sudo pip install azure-storage==0.30.0 # for compability with Azure Stack
sudo pip install python-magic

#### Collectd ####
sudo apt-get install -y collectd
#TOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOODO: DOWNLOAD CONF FILE
cd ~/Conf/collectd
sudo sed -i "s/INFLUX_IP_OR_DOMAIN/$6/g" collectd.conf
sudo sed -i "s/INFLUX_UDP_USERNAME/$4/g" collectd.conf
sudo sed -i "s/INFLUX_UDP_PASSWORD/$5/g" collectd.conf
sudo sed -i "s/CV_NODE/$7/g" collectd.conf
sudo mv collectd.conf /etc/collectd
sudo service collectd restart

#### MXNET: http://mxnet.io/get_started/ubuntu_setup.html ####
cd ~
sudo apt-get install -y git libatlas-base-dev libopencv-dev libopenblas-dev
# Get MXNet source code
git clone https://github.com/dmlc/mxnet.git ~/mxnet --recursive
# Move to source code parent directory
cd mxnet
cp make/config.mk .
echo "USE_BLAS=openblas" >>config.mk
echo "ADD_CFLAGS += -I/usr/include/openblas" >>config.mk
echo "ADD_LDFLAGS += -lopencv_core -lopencv_imgproc -lopencv_imgcodecs" >>config.mk
sudo make
sudo pip install graphviz
sudo pip install Jupyter

#TOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOODO: GET Task Code, Run"Python cv.py", Set up auto-restart
cd ~
sudo mv requestsclient.py /usr/local/lib/python2.7/dist-packages/azure/storage/_http/
sudo rm /usr/local/lib/python2.7/dist-packages/azure/storage/_http/requestsclient.pyc

cd ~
sudo mv image-classification-predict.cc ./mxnet/example/image-classification/predict-cpp/
cd ./mxnet/example/image-classification/predict-cpp/
sudo make
sudo mv ./image-classification-predict ~/Task/filters/
sudo chmod +x ~/Task/filters/image-classification-predict

cd ~/Task
sudo sed -i "s/STORAGE_ACCOUNT_NAME/$1/g" filters/app.conf
sudo sed -i "s/STORAGE_ACCOUNT_KEY/$2/g" filters/app.conf
sudo sed -i "s/API_ENDPOINT_SUFFIX/$3/g" filters/app.conf
export PYTHONHTTPSVERIFY=0 # for urlib2 
python -W ignore cv.py


### DO not forget setup CORS and enable Storage Analytics