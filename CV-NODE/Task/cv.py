import urllib
import urllib2
import urlparse
import os
import ConfigParser
import time
import magic
import metric

from azure.common import (
    AzureHttpError,
    AzureConflictHttpError,
    AzureMissingResourceHttpError,
)
from azure.storage import (
    Logging,
    Metrics,
    CorsRule,
    CloudStorageAccount,
)
from azure.storage.table import (
    Entity,
    TableBatch,
    EdmType,
    EntityProperty,
    TablePayloadFormat,
    TableService,
)

from azure.storage.queue import (
    QueueService,
)
from azure.storage.blob import (
    BlockBlobService,
)

cp = ConfigParser.SafeConfigParser()
cp.read('app.conf')
queuesvc = QueueService(account_name = cp.get('storage_account', 'account_name'), account_key = cp.get('storage_account', 'account_key'), endpoint_suffix = cp.get('storage_account', 'endpoint_suffix'))
tablesvc = TableService(account_name = cp.get('storage_account', 'account_name'), account_key = cp.get('storage_account', 'account_key'), endpoint_suffix = cp.get('storage_account', 'endpoint_suffix'))
blobsvc = BlockBlobService(account_name = cp.get('storage_account', 'account_name'), account_key = cp.get('storage_account', 'account_key'), endpoint_suffix = cp.get('storage_account', 'endpoint_suffix'))
TASK_QUEUE = cp.get('storage_account', 'task_queue')
TASK_TABLE = cp.get('storage_account', 'task_table')
METRIC_TABLE = cp.get('storage_account', 'metric_table')
METRIC_TABLE_PK = cp.get('storage_account', 'metric_table_pk')
METRIC_TASK_COUNT_RK = cp.get('storage_account', 'metric_task_count_rk')
METRIC_BLOB_COUNT_RK = cp.get('storage_account', 'metric_blob_count_rk')

dir_path = os.path.dirname(os.path.realpath(__file__))

# Apply an image filter
def applyFilter(local_filename, filtername, RowKey, ext):
    dir_path = os.path.dirname(os.path.realpath(__file__))
    output_filename = dir_path + "/data/" + filtername + "_"+ RowKey + ext
    cmd = "cd "+ dir_path + "/filters && python -W ignore ./" + filtername +".py " + local_filename + " " + output_filename +" " + filtername + " " + RowKey
    os.system(cmd)

# Download an image file and ensure there will be extension
def downloadImage(url, dst):
    if not os.path.exists(dst):
        print "Downloading from " + url
        try:
            req = urllib2.Request(url, headers = {
                'User-Agent' : 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36', 
                'Referer':url, 
                "Accept":"image/webp,image/*,*/*;q=0.8" 
                })
            imgData = urllib2.urlopen(req).read()
            output = open(dst,'wb')
            output.write(imgData)
            output.close()
            if not os.path.exists(dst):
                print "Download failed"
                return False
        except:
            print "Download failed"
            return False
    mime = magic.from_file(dst, mime=True)
    print mime
    if (not ('image' == mime[:5])) or ('image/gif' == mime) or ('image/x-icon' == mime):
        print "File type not supported"
        os.remove(dst)
        return False
    else:
        mimeext = {"image/jpeg":"jpg", "image/pjpeg":"jpg"}
        dot = dst.find('.')
        if(dot == -1):
            ext = mimeext.get(mime, mime[6:])       
            os.rename(dst, dst + "." + ext)
            return dst + "." + ext
        else:      
            return dst

# clear a task
def clearTask(localfile = None, msg = None, RK = None, ext = None):
    if localfile:
        try:
            os.remove(localfile)
            print "Deleted File: " + localfile
        except:
            pass
    if msg:
        try:
            queuesvc.delete_message(TASK_QUEUE, msg.id, msg.pop_receipt)
            print "Deleted Msg: " + msg.id
        except:
            pass

    if RK:
        try:
            tablesvc.delete_entity(TASK_TABLE, RK[:3], RK)
            print "Deleted Task: " + RK
            metric.incrementMetric(-1, METRIC_TASK_COUNT_RK, METRIC_TABLE, METRIC_TABLE_PK, tablesvc)
            print "Task count --"
        except:
            pass
        try:
            blobsvc.delete_blob(RK[:3], RK + ext)
            print "Deleted Blob: " + RK + ext
            metric.incrementMetric(-1, METRIC_BLOB_COUNT_RK, METRIC_TABLE, METRIC_TABLE_PK, tablesvc)
            print "Blob count --"
        except:
            pass
        try:
            blobsvc.delete_blob(RK[:3], 'thumbnail_' + RK + ext)
            print "Deleted Blob: " + 'thumbnail_' + RK + ext
            metric.incrementMetric(-1, METRIC_BLOB_COUNT_RK, METRIC_TABLE, METRIC_TABLE_PK, tablesvc)
            print "Blob count --"
        except:
            pass
        try:
            blobsvc.delete_blob(RK[:3], 'facedetect_' + RK + ext)
            print "Deleted Blob: " + 'facedetect_' + RK + ext
            metric.incrementMetric(-1, METRIC_BLOB_COUNT_RK, METRIC_TABLE, METRIC_TABLE_PK, tablesvc)
            print "Blob count --"
        except:
            pass

if __name__ == '__main__':
    print "Welcome to CV! We'll start looking into your photos. [1.0.3]"  
    while True:
        try:
            messages = queuesvc.get_messages(TASK_QUEUE, 1, visibility_timeout = int(cp.get('task', 'queue_visibility_timeout')))
            print "TRY # "+ messages[0].dequeue_count
            msgs = messages[0].content.split('(^_^)')
            url = msgs[1]
            RowKey = msgs[0]
            filename, file_extension = os.path.splitext(urlparse.urlsplit(url).path) 
            local_filename = dir_path + '/data/' + RowKey + file_extension
            cnt = 0
            # Thumbnail should go prior to those filters who need SMALLER images due to memory limitation
            filters = ['thumbnail', 'facedetect', 'classify']
            try:
                rt = downloadImage(url, local_filename)
                if rt:
                    local_filename = rt
                    filename, file_extension = os.path.splitext(local_filename)  
                    entity = tablesvc.get_entity(TASK_TABLE, RowKey[:3], RowKey)                
                    for f in filters:
                        try:
                            if entity[f] <> "":
                                cnt = cnt + 1
                                print f + " Done"
                        except:
                            applyFilter(local_filename, f, RowKey, file_extension)
                    if cnt < len(filters):
                        cnt = 0
                        entity = tablesvc.get_entity(TASK_TABLE, RowKey[:3], RowKey)                
                        for f in filters:
                            try:
                                if entity[f] <> "":
                                    cnt = cnt + 1
                                    print f + " Done"
                            except:
                                pass
                else:
                    clearTask(msg = messages[0], RK = RowKey, ext = file_extension)
            except:
                clearTask(localfile = local_filename, msg = messages[0], RK = RowKey, ext = file_extension)            
            if cnt == len(filters): # All finished
                clearTask(localfile = local_filename, msg = messages[0])
            else: # not finished
                if int(messages[0].dequeue_count) > int(cp.get('task', 'max_retry')):
                    clearTask(localfile = local_filename, msg = messages[0], RK = RowKey, ext = file_extension)
        except:
            os.system("kill -s 9 `ps -aux | grep predict | awk '{print $2}'`")
            print "No news is good news. Sleeping for 5 seconds."
            time.sleep(5)
    str = raw_input("Press Enter to Exit")
