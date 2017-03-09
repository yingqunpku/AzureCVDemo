#!/usr/bin/env python

'''
Generating thumbnail (max 100 x 100) with opencv

USAGE:
    classify.py <src-file> <dst-file> <filter-name> <row-key>
'''


import sys
sys.path.append("..")
import os
import updateTask
import time
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
    print "> Classifying " + src
    os.system("kill -s 9 `ps -aux | grep predict | awk '{print $2}'`")
    os.system('./image-classification-predict ' + src + ' ' + dst +'&')
    loops = 10
    while loops > 0:
        time.sleep(3)
        try:
            fo = open(dst, 'r')
            content = fo.read().strip()
            idx = content.rfind('Best Result:')
            if idx > -1:
                container = rkey[:3]
                result = content[idx + 12:]
                #  [ wig] id = 903, accuracy = 0.26511309
                #  [ candle, taper, wax light] id = 470, accuracy = 0.13563494
                idx = result.rfind('0.')
                if idx > -1:
                    accuracy = round(float(result[idx:]) * 100)
                    idx = result.find(']')
                    if idx > -1:
                        classification = result[:idx + 1].strip().strip('[').strip(']').strip()
                        data = {fname: result, "accuracy":accuracy, "classification":classification}
                        print data
                        updateTask.updateTask(cp, container, rkey, data)
                break
        except:
            pass
        loops = loops -1
    os.system("kill -s 9 `ps -aux | grep predict | awk '{print $2}'`")
    os.remove(dst)