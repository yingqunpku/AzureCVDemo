function Config() {


	this.storageAccount = "STORAGE_ACCOUNT_NAME";
	this.accountKey = "STORAGE_ACCOUNT_KEY";
	this.host = "API_ENDPOINT_SUFFIX";

	this.taskTable = "imgTask";
	this.taskQueue = "imgtaskqueue";

	this.metricTable = "taskMetrics";
	this.metricTablePK = "metric";
	this.metricTaskCountRK = "tasks";
	this.metricBlobCountRK = "blobs";
	
	this.storageAnalyticsBlobMetricsTable = "$MetricsMinutePrimaryTransactionsBlob";
	this.storageAnalyticsQueueMetricsTable = "$MetricsMinutePrimaryTransactionsQueue";
	this.storageAnalyticsTableMetricsTable = "$MetricsMinutePrimaryTransactionsTable";

	this.pageSize = 45;

}
module.exports = Config;