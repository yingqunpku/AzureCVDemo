from azure.storage.table import (
    Entity,
    TableBatch,
    EdmType,
    EntityProperty,
    TablePayloadFormat,
    TableService,
)


def updateTask(cp, pk, rk, data):
    tablesvc = TableService(account_name = cp.get('storage_account', 'account_name'), 
        account_key = cp.get('storage_account', 'account_key'), 
        endpoint_suffix = cp.get('storage_account', 'endpoint_suffix'))
    task = {'PartitionKey': pk, 'RowKey': rk}
    task.update(data)
    tablesvc.merge_entity(cp.get('storage_account', 'task_table'), task)

