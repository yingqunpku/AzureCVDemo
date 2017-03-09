

def doincre(delta, entity, cnt, RK, table, PK, tablesvc):
    if cnt > 0:
        item = {"PartitionKey": PK, "RowKey": RK, "value": int(entity.value) + delta, "etag": entity.etag}
        try:
            tablesvc.merge_entity(table, item)
        except:
            result = tablesvc.get_entity(table, PK, RK)
            doincre(delta, result, cnt - 1, RK, table, PK, tablesvc)

def incrementMetric(delta, RK, table, PK, tablesvc):
    try:
        result = tablesvc.get_entity(table, PK, RK)
        doincre(delta, result, 10000, RK, table, PK, tablesvc)
    except:
        pass