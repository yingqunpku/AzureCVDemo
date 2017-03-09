#!/usr/bin/env python

'''
face detection using haar cascades

USAGE:
    facedetect.py <src-file> <output-file> <filter-name> <row-key>
'''


import cv2
import sys
sys.path.append("..")
import os
import upload
import updateTask
import ConfigParser

def detect(img, cascade):
    rects = cascade.detectMultiScale(img, scaleFactor=1.3, minNeighbors=4, minSize=(30, 30),
                                     flags=cv2.CASCADE_SCALE_IMAGE)
    if len(rects) == 0:
        return []
    rects[:,2:] += rects[:,:2]
    return rects

def draw_rects(img, rects, color):
    for x1, y1, x2, y2 in rects:
        cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)

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
    print "> Detecting faces from " + src
    cascade = cv2.CascadeClassifier("../data/haarcascades/haarcascade_frontalface_alt.xml")
    img = cv2.imread(src, True)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)

    rects = detect(gray, cascade)
    faces = len(rects)        
    container = rkey[:3]
    blobname = os.path.basename(dst)
    data = {'faces': faces, fname : " "}
    if faces > 0:
        vis = img.copy()
        draw_rects(vis, rects, (0, 255, 0))
        cv2.imwrite(dst, vis)
        upload.uploadFile(cp, dst, container, blobname)        
        data = {fname : "https://"+ cp.get('storage_account', 'account_name') +".blob." + cp.get('storage_account', 'endpoint_suffix') + "/" + container + "/" + blobname, 'faces': faces}
        os.remove(dst)
    updateTask.updateTask(cp, container, rkey, data)
    