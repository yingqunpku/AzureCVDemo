import magic
import sys
sys.path.append("..")
import metric

from azure.storage.blob import (
    BlockBlobService,
    ContentSettings,
)
from azure.storage.table import (
    Entity,
    TableBatch,
    EdmType,
    EntityProperty,
    TablePayloadFormat,
    TableService,
)


def uploadFile(cp, localfile, container, blob):
    blobsvc = BlockBlobService(account_name = cp.get('storage_account', 'account_name'), account_key = cp.get('storage_account', 'account_key'), endpoint_suffix = cp.get('storage_account', 'endpoint_suffix'))
    tablesvc = TableService(account_name = cp.get('storage_account', 'account_name'), account_key = cp.get('storage_account', 'account_key'), endpoint_suffix = cp.get('storage_account', 'endpoint_suffix'))
    try:
        blobsvc.create_blob_from_path(container, blob, localfile, content_settings = ContentSettings(content_type = magic.from_file(localfile, mime = True)))
        METRIC_TABLE = cp.get('storage_account', 'metric_table')
        METRIC_TABLE_PK = cp.get('storage_account', 'metric_table_pk')
        METRIC_BLOB_COUNT_RK = cp.get('storage_account', 'metric_blob_count_rk')
        metric.incrementMetric(1, METRIC_BLOB_COUNT_RK, METRIC_TABLE, METRIC_TABLE_PK, tablesvc)
    except:
        pass