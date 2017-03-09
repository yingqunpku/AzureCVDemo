#!/usr/bin/env python

'''
Generating thumbnail (max 100 x 100) with opencv

USAGE:
    thumbnail.py <src-file> <output-file> <filter-name> <row-key>
'''


import cv2
import sys
sys.path.append("..")
import imutils
import os
import upload
import updateTask
import ConfigParser

if __name__ == '__main__':
    try:
        src = sys.argv[1]
    except:
        print(__doc__)
    try:
        dst = sys.argv[2]
    except:
        print(__doc__)
    try:
        fname = sys.argv[3]
    except:
        print(__doc__)
    try:
        rkey = sys.argv[4]
    except:
        print(__doc__)
    cp = ConfigParser.SafeConfigParser()
    cp.read('../app.conf')
    print "> Generating thumbnail from " + src
    img = cv2.imread(src, True)
    imRes = imutils.resize(img, width = 200)
    cv2.imwrite(dst, imRes)
    if os.path.getsize(src) > 1536000:
        imRes2 = imutils.resize(img, width = 1024)
        cv2.imwrite(src, imRes2)
        if os.path.getsize(src) > 1536000:
            img = cv2.imread(src, True)
            imRes3 = imutils.resize(img, height = 768)
            cv2.imwrite(src, imRes3)
    container = rkey[:3]
    blobname = os.path.basename(dst)
    upload.uploadFile(cp, dst, container, blobname)
    data = {fname : "https://"+ cp.get('storage_account', 'account_name') +".blob." + cp.get('storage_account', 'endpoint_suffix') + "/" + container + "/" + blobname}
    updateTask.updateTask(cp, container, rkey, data)
    os.remove(dst)