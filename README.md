README

1.	App folder initialization
	Follow these steps to deploy the sync files into an app folder:
	a. Create a an app folder on the deployment server and put all the sync files there.
	b. go in the folder (cd [folder name])
	c. In the folder, type: 'npm init -y' and press enter key to initialize the app
	d. type: npm install express and press Enter key 
	e. Install the necessry modules by typing the following commands and press Enter key :
		npm install fs
		npm install mssql
		npm install winston
		npm install util
		npm install react-icons
		npm install readline-sync

	f.	In the app folder, create a 'log' folder for the log file entry

2.	Configuration Settings

	2.1	Parameter settings
		Open the /sync-settings/settingData.json file in editor
		You will see a series of parameters:
		a. dbpath - The database connection string 
		b. dbtype - The database name
		c. BASEURL - The URL of the server path
		d. authkey - The Authorization key string for data query and payload submission
		e. defaultfolderId - The highest level folder Id in M4
		f. TradeTranstrxDTFrom - Query parameter for trxDT for Trade Transaction Journal Sync 
		g. TradeTranstrxDTTo - Query parameter for trxDT for Trade Transaction Journal Sync 
		h. QueryLimit - Maximum number of records for Query (If left empty will be unlimited)

	2.2	Last Sync Settings
		Open the /sync-settings/LastSync.json file in editor
		The bellow settings are custom sync SQL query conditions:
		ItemLastSyncInclude
		ContactLastSyncInclude
		SubContactSyncInclude
		TradeTransLastSyncInclude

	2.3	Payload Template Settings

		2.3.1	Contact Type Id setting
				Open the /sync-settings/sync-contact-config.json file in editor, search the text 'infodatablock'.
				You will see the infodatablock section and you will find a list of listings.
				At the end of:
				{ "key": "type", "map":"", "updated":false, "value":null, "lookupsourcefield":"", "isdata":false, "datamap":"", "rowsourcefield":"Type",...
				You will see the the mapping option for Customer, Supplier, Introducer and etc:
				"mappingsoptions":{"Customer":"AAAAMQAAQACAADAAAAAAAQ", "Supplier":"6-ruz5clSvKU5zVLGxSiDg", "Introducer":"6-ruz...
				Amend the Id values as needed.

	2.4	SQL Query
		Open the SQLQuery.js in editor. You will see the respective SQL Query for Contacts, Item and Trade Transaction.
		Amend them as needed.

3.0	How to run
	Open the terminal, Go into the app folder. Type : node syncjobs.js and press Enter key
	You will see the message: Server is running on port 3000 in the terminal
	
	3.1	Run Each Sync job individually
		To Run each sync job individually, open the browser, type each of the respective url in the browser:
		For Item: http://localhost:3000/syncitem
		For Contact: http://localhost:3000/synccontact
		For Trade Transaction: http://localhost:3000/synctradetrans

		Note: 	The http://localhost:3000/ refers to the local URL when doing testing at local machine, change it as according to where you	
				deploy the app files and where you run the script.

		When you see message "End Run" in the terminal, means the sync job has finished.

	3.2	Run All Sync job
		To Run all sync jobs, open the browser, type the following url in the browser:
		http://localhost:3000/all
	
		When you see message "End Run" in the terminal, means the sync job has finished.

4.0	To see the log file entries
	The log file is located inside folder /log. Each log file name reflect each respective date filename.
