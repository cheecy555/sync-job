const express = require('express'); // Importing express
const app = express(); // Creating an express app
const fs = require('fs');   
const util = require('util');
const { MdFormatOverline } = require('react-icons/md'); 
const { json } = require('stream/consumers');
const contact = require('./sync-contact');
const subcontact = require('./sync-subcontact');
const tradetrans = require('./sync-tradetransjournal');
const item = require('./sync-item');
const sqlqueries = require('./SQLQuery');
const loggerfunc = require("./logger");
const func = require('./functions');
const url = require('url');
const runsql = require('./runSql');
const sqlpool = require('./mssql-pool-manager');

app.use(express.raw({ type: '*/*', limit: '10mb' }));

const Settingjson                          = fs.readFileSync("./sync-settings/settingData.json");
const settingconfig                        = JSON.parse(Settingjson);
const dbpath                               = settingconfig.dbpath;

/* For Sync Contact */
const contactjsonString                   = fs.readFileSync("./sync-settings/sync-contact-config.json");
const contactconfigdata                   = JSON.parse(contactjsonString); 
/* For Sync Sub Contact */
const subcontactjsonString                = fs.readFileSync("./sync-settings/sync-subcontact-config.json");
const subcontactconfigdata                = JSON.parse(subcontactjsonString); 
/* For Sync Trade Trans */
const tradetransjsonString                = fs.readFileSync("./sync-settings/sync-tradetrans-config.json");
const tradetransconfigdata                = JSON.parse(tradetransjsonString); 
/* For Sync Items */
const itemjsonString                      = fs.readFileSync("./sync-settings/sync-item-config.json");
const itemconfigdata                      = JSON.parse(itemjsonString);

/* Parameters Section */
var authkey                               = settingconfig.authkey;
const BASEURL                             = settingconfig.BASEURL;  
const contactsubmiturl                    = settingconfig.contactsubmiturl;
const journalsubmiturl                    = settingconfig.journalsubmiturl;   
const itemsubmiturl                       = settingconfig.itemsubmiturl;  
const subcontactsubmiturl                 = settingconfig.subcontactsubmiturl;  
const defaultfolderId                     = settingconfig.defaultfolderId;
const TradeTransTrxDTFrom                 = settingconfig.TradeTranstrxDTFrom;
const TradeTransTrxDTTo                   = settingconfig.TradeTranstrxDTTo;
const Errorurl                            = '/api/post';  
const Batchprocessurl                     = '/h/myinvois-auto-batch-process?runnow=1';  
var QueryLimit                            = settingconfig.QueryLimit;

QueryLimit                                = String(QueryLimit).trim();
/* END Parameters Section */


app.get('/synccontact', async (req, res) => {
      var processok;
      var logfilename                           = func.Logfilename('contact'), LastSyncph = '', sqlLimitStr='';
      var queryparam 				      = url.parse(req.url, true).query;
      const db                                  = queryparam?.db || settingconfig.dbtype;
      const debug                               = queryparam?.debug || false;
      const pool                                = await sqlpool.get(db,`${dbpath}Database=${db}`);
      const qrykey                              = queryparam?.contact || 'contact';
      const sqlqrs                              = sqlqueries.Sqlqueries[qrykey];
      var sqlQuery                              = sqlqrs.q;
      const SyncSettings                        = fs.readFileSync("./sync-settings/LastSync.json");
      const Syncsettingconfig                   = JSON.parse(SyncSettings);
      //const ContactLastSync                     = Syncsettingconfig.ContactLastSync;
      //const ContactSyncInclude                  = Syncsettingconfig.ContactLastSyncInclude;
      if(QueryLimit){ sqlLimitStr = ` TOP ${QueryLimit} `;  }
      sqlQuery = sqlQuery.replace('@LIMIT', sqlLimitStr);       

      //sqlQuery = sqlQuery.replace('@LastSync', func.GenerateLastSync_placeholder('contact', ContactLastSync, ContactSyncInclude)  );
      const qkey = db + "_" + qrykey;
      let lastsync = (Syncsettingconfig["ContactID_" +qkey] ? `ID>${Syncsettingconfig["ContactID_" + qkey]} AND ` : (Syncsettingconfig?.ContactAccNo?.length ? `NOT ${sqlqrs.k} IN('${Syncsettingconfig.ContactAccNo.join("','")}') AND ` : ''))
      sqlQuery = sqlQuery.replace('@LastSync', lastsync);
      //throw new Error(`LastSync: ${lastsync}, ContactID:${Syncsettingconfig["ContactID_" + db]}, sqlquery: ${JSON.stringify(Syncsettingconfig)}`);

      const logger = await loggerfunc.StartLogger(logfilename);
      const contactresult =   await contact.syncContacts(req, res, qkey, BASEURL, authkey, contactsubmiturl, contactconfigdata.Demopest.Contacts, sqlQuery, Syncsettingconfig?.ContactAccNo, pool, false, defaultfolderId, logger, debug);
      pool.close();    
      if(contactresult.ok){
            processok += "Contact Sync OK. ";
      }else{
            processok += "Contact Sync Error. ";
      }
      return processok;
});

app.get('/syncsubcontact', async (req, res) => {
      var processok;
      var logfilename               = func.Logfilename('subcontact'), LastSyncph = '', sqlLimitStr='';
      var queryparam 		      = url.parse(req.url, true).query;
      const db                      = queryparam?.db || settingconfig.dbtype;
      const debug                   = queryparam?.debug || false;
      const pool                    = await sqlpool.get(db,`${dbpath}Database=${db}`);    
      const qrykey                  = queryparam?.subcontact || 'subcontact';
      const sqlqrs                  = sqlqueries.Sqlqueries[qrykey];
      var sqlQuery                  = sqlqrs.q;
      const SyncSettings            = fs.readFileSync("./sync-settings/LastSync.json");
      const Syncsettingconfig       = JSON.parse(SyncSettings);
      const SubContactLastSync      =  Syncsettingconfig.SubContactLastSync;
      const SubContactSyncInclude   =  Syncsettingconfig.SubContactSyncInclude;
      if(QueryLimit){ sqlLimitStr = ` TOP ${QueryLimit} `;  }
      
      sqlQuery = sqlQuery.replace('@LIMIT', sqlLimitStr);       
      const qkey = db + "_" + qrykey;
      sqlQuery = sqlQuery.replace('@LastSync', func.GenerateLastSync_placeholder('subcontact', SubContactLastSync, SubContactSyncInclude)  );
      const logger = await loggerfunc.StartLogger(logfilename);
      const subcontactresult =   await subcontact.syncSubContacts(req, res, qkey, BASEURL, authkey, subcontactsubmiturl, subcontactconfigdata.Demopest.SubContacts, sqlQuery, pool, defaultfolderId, false, logger, debug);
      pool.close();    
      if(subcontactresult.ok){
            processok += "Sub Contact Sync OK. ";
      }else{
            processok += "Sub Contact Sync Error. ";
      }
      return processok;
});

app.get('/syncitem', async (req, res) => {
      var processok;
      var logfilename               = func.Logfilename('item'), LastSyncph = '', sqlLimitStr='';
      var queryparam 		      = url.parse(req.url, true).query;
      const db                      = queryparam?.db || settingconfig.dbtype;
      const debug                   = queryparam?.debug || false;
      const pool                    = await sqlpool.get(db,`${dbpath}Database=${db}`);      
      const qrykey                  = queryparam?.item || 'item';
      const sqlqrs                  = sqlqueries.Sqlqueries[qrykey];
      var sqlQuery                  = sqlqrs.q;
      const SyncSettings            = fs.readFileSync("./sync-settings/LastSync.json");
      const Syncsettingconfig       = JSON.parse(SyncSettings);
      const ItemLastSync            =  Syncsettingconfig.ItemLastSync;
      const ItemSyncInclude         =  Syncsettingconfig.ItemLastSyncInclude;
      if(QueryLimit){ sqlLimitStr = ` TOP ${QueryLimit} `;  }

      sqlQuery = sqlQuery.replace('@LIMIT', sqlLimitStr);      
      const qkey = db + "_" + qrykey;          
      sqlQuery = sqlQuery.replace('@LastSync', func.GenerateLastSync_placeholder('item', ItemLastSync, ItemSyncInclude)  );
      const logger = await loggerfunc.StartLogger(logfilename);        
      const itemresult =   await item.syncItems(req, res, qkey, BASEURL, authkey, itemsubmiturl, itemconfigdata.Demopest.Items, sqlQuery, pool, false, defaultfolderId, logger, debug);
      pool.close();    
      if(itemresult.ok){
            processok += "Contact Sync OK. ";
      }else{
            processok += "Contact Sync Error. ";
      }
      return processok;
});

app.get('/synctradetrans', async (req, res) => {
      var processok;
      var logfilename               = func.Logfilename('tradetrans'), LastSyncph = '', sqlLimitStr='';
      var queryparam 		      = url.parse(req.url, true).query;
      const db                      = queryparam?.db || settingconfig.dbtype;
      const debug                   = queryparam?.debug || false;
      const pool                    = await sqlpool.get(db,`${dbpath}Database=${db}`);    
      const qrykey                  = queryparam?.trade || 'trade';
      const sqlqrs                  = sqlqueries.Sqlqueries[qrykey];
      var sqlQuery                  = sqlqrs.q;
      const SyncSettings            = fs.readFileSync("./sync-settings/LastSync.json");
      const Syncsettingconfig       = JSON.parse(SyncSettings);
      //const TradeTransLastSync      =  Syncsettingconfig.TradeTransLastSync;
      //const TradeTransSyncInclude   =  Syncsettingconfig.TradeTransLastSyncInclude
      if(QueryLimit){ sqlLimitStr = ` TOP ${QueryLimit} `;  }

      sqlQuery = sqlQuery.replace('@TrxDT', func.GenerateTrxDT_Placeholder('tradetrans', TradeTransTrxDTFrom, TradeTransTrxDTTo) );      
      sqlQuery = sqlQuery.replace('@LIMIT', sqlLimitStr);           

      //sqlQuery = sqlQuery.replace('@LastSync', Syncsettingconfig?.TradeTransDocNo?.length ? `NOT ${sqlqrs.k} IN('${Syncsettingconfig.TradeTransDocNo.join("','")}') AND ` : '');
      const qkey = db + "_" + qrykey;
      let lastsync = (sqlqrs.dt && Syncsettingconfig["TradeTransDT_" + qkey] ? `${sqlqrs.dt}>='${Syncsettingconfig["TradeTransDT_" + qkey]}' AND ` : (Syncsettingconfig?.TradeTransDocNo?.length ? `NOT ${sqlqrs.k} IN('${Syncsettingconfig.TradeTransDocNo.join("','")}') AND ` : ''))
      sqlQuery = sqlQuery.replace('@LastSync', lastsync);

      const logger = await loggerfunc.StartLogger(logfilename);
      const tradetransresult = await tradetrans.syncTradeTrans(req, res, qkey, BASEURL, authkey, journalsubmiturl, tradetransconfigdata.Demopest.tradetrans, sqlQuery, Syncsettingconfig?.TradeTransDocNo, pool, false, defaultfolderId, logger, debug);
      pool.close();    
      //return res.status(200).json({sql:sqlQuery});

      if(tradetransresult.ok){
            processok += "Trade transaction Sync OK. ";
      }else{
            processok += "Trade transaction Sync Error. ";
      }
      return processok;
});

app.get('/all', async (req, res) => {
      
      var logfilename = func.Logfilename('all');
      var successcount = 0, failedcount = 0, skipcount=0, returnstatus = true, outputlog = [], sqlQuery, sqlqrs, qrykey, qkey, sqlLimitStr='', lastsync;
      var queryparam = url.parse(req.url, true).query;
      const db = queryparam?.db || settingconfig.dbtype;
      const debug = queryparam?.debug || false;
      const pool = await sqlpool.get(db,`${dbpath}Database=${db}`);      
      const logger = await loggerfunc.StartLogger(logfilename);
      const SyncSettings                        = fs.readFileSync("./sync-settings/LastSync.json");
      const Syncsettingconfig                   = JSON.parse(SyncSettings);            

      if(QueryLimit){ sqlLimitStr = ` TOP ${QueryLimit} `;  }

      /* Sync Item*/
      console.log(`Start Sync Item`);
      qrykey = queryparam?.item || 'item';
      sqlqrs = sqlqueries.Sqlqueries[qrykey];
      sqlQuery = sqlqrs.q;
      const ItemLastSync            =  Syncsettingconfig.ItemLastSync;
      const ItemSyncInclude         =  Syncsettingconfig.ItemLastSyncInclude;      
      sqlQuery = sqlQuery.replace('@LIMIT', sqlLimitStr);
      qkey = db + "_" + qrykey;    
      sqlQuery = sqlQuery.replace('@LastSync', func.GenerateLastSync_placeholder('item', ItemLastSync, ItemSyncInclude)  );
      const itemresult =   await item.syncItems(req, res, qkey, BASEURL, authkey, itemsubmiturl, itemconfigdata.Demopest.Items, sqlQuery, pool, true, defaultfolderId, logger, debug);
      if(!itemresult.ok)
      {  returnstatus = false; }
      failedcount += itemresult.data.fail;
      successcount += itemresult.data.success;
      skipcount += itemresult.skip;
      for (let er of itemresult.data.Error) {
            outputlog.push(er);
      }

      console.log(`Start Sync Contact`);
      qrykey = queryparam?.contact || 'contact';
      sqlqrs = sqlqueries.Sqlqueries[qrykey];
      sqlQuery = sqlqrs.q;
      //const ContactLastSync                     =  Syncsettingconfig.ContactLastSync;
      //const ContactSyncInclude                  =  Syncsettingconfig.ContactLastSyncInclude;
      sqlQuery = sqlQuery.replace('@LIMIT', sqlLimitStr); 
      //sqlQuery = sqlQuery.replace('@LastSync', Syncsettingconfig?.ContactAccNo?.length ? `NOT ${sqlqrs.k} IN('${Syncsettingconfig.ContactAccNo.join("','")}') AND ` : '');
      qkey = db + "_" + qrykey;
      lastsync = (Syncsettingconfig["ContactID_" + qkey] ? `ID>${Syncsettingconfig["ContactID_" + qkey]} AND ` : (Syncsettingconfig?.ContactAccNo?.length ? `NOT ${sqlqrs.k} IN('${Syncsettingconfig.ContactAccNo.join("','")}') AND ` : ''))
      sqlQuery = sqlQuery.replace('@LastSync', lastsync);

      const contactresult =  await contact.syncContacts(req, res, qkey, BASEURL, authkey, contactsubmiturl, contactconfigdata.Demopest.Contacts, sqlQuery, Syncsettingconfig?.ContactAccNo, pool, true, defaultfolderId, logger, debug);      
      if(!contactresult.ok)
      {  returnstatus = false; }
      failedcount += contactresult.data.fail;
      successcount += contactresult.data.success;
      skipcount += contactresult.skip;
      for (let er of contactresult.data.Error) {
            outputlog.push(er);
      }

      console.log(`Start Sync Sub Contact`);
      qrykey = queryparam?.subcontact || 'subcontact';
      sqlqrs = sqlqueries.Sqlqueries[qrykey];
      sqlQuery = sqlqrs.q;
      const SubContactLastSync                  =  Syncsettingconfig.SubContactLastSync;
      const SubContactSyncInclude               =  Syncsettingconfig.SubContactSyncInclude;
      sqlQuery = sqlQuery.replace('@LIMIT', sqlLimitStr);
      qkey = db + "_" + qrykey;
      sqlQuery = sqlQuery.replace('@LastSync', func.GenerateLastSync_placeholder('subcontact', SubContactLastSync, SubContactSyncInclude)  );
      const subcontactresult =   await subcontact.syncSubContacts(req, res, qkey, BASEURL, authkey, subcontactsubmiturl, subcontactconfigdata.Demopest.SubContacts, sqlQuery, pool, defaultfolderId, true, logger, debug);
      if(!subcontactresult.ok)
      {  returnstatus = false; }
      failedcount += subcontactresult.data.fail;
      successcount += subcontactresult.data.success;
      skipcount += subcontactresult.skip;
      for (let er of subcontactresult.data.Error) {
            outputlog.push(er);
      }

      console.log(`Start Sync Trade Transaction`);
      qrykey = queryparam?.trade || 'trade';
      sqlqrs = sqlqueries.Sqlqueries[qrykey];
      sqlQuery = sqlqrs.q;
      //const TradeTransLastSync      =  Syncsettingconfig.TradeTransLastSync;
      //const TradeTransSyncInclude   =  Syncsettingconfig.TradeTransLastSyncInclude
      sqlQuery = sqlQuery.replace('@TrxDT', func.GenerateTrxDT_Placeholder('tradetrans', TradeTransTrxDTFrom, TradeTransTrxDTTo) );
      sqlQuery = sqlQuery.replace('@LIMIT', sqlLimitStr);    

      //sqlQuery = sqlQuery.replace('@LastSync', Syncsettingconfig?.TradeTransDocNo?.length ? `NOT ${sqlqrs.k} IN('${Syncsettingconfig.TradeTransDocNo.join("','")}') AND ` : '');
      qkey = db + "_" + qrykey;
      lastsync = (sqlqrs.dt && Syncsettingconfig["TradeTransDT_" + qkey] ? `${sqlqrs.dt}>='${Syncsettingconfig["TradeTransDT_" + qkey]}' AND ` : (Syncsettingconfig?.TradeTransDocNo?.length ? `NOT ${sqlqrs.k} IN('${Syncsettingconfig.TradeTransDocNo.join("','")}') AND ` : ''))
      sqlQuery = sqlQuery.replace('@LastSync', lastsync);

      const tradetransresult = await tradetrans.syncTradeTrans(req, res, qkey, BASEURL, authkey, journalsubmiturl, tradetransconfigdata.Demopest.tradetrans, sqlQuery, Syncsettingconfig?.TradeTransDocNo, pool, true, defaultfolderId, logger, debug);      
      if(!tradetransresult.ok)
      {  returnstatus = false; }
      failedcount += tradetransresult.data.fail;
      successcount += tradetransresult.data.success;
      skipcount += tradetransresult.skip;
      for (let er of tradetransresult.data.Error) {
            outputlog.push(er);
      }
            
      pool.close();    

      if (outputlog.length){
            let posterr = outputlog.filter(l => !l.includes('already exists'));
            if (posterr && posterr.length){
                  await func.submitError('all', authkey, `${BASEURL}${Errorurl}`, posterr, defaultfolderId);
            }
      }
      console.log(`End Run`);
    
      return res.status(200).json({ ok: returnstatus, data: {success: successcount, fail: failedcount, skip: skipcount, Error: outputlog} });
});

app.get('/sql', async (req, res) => {
	res.sendFile('sql.html', {root: __dirname })
});

app.post('/sql', async (req, res) => {
	let sqlResult = [{'Data':'no result'}];
	let sqlquery = '';
	try{
            var queryparam = url.parse(req.url, true).query;
            const db = queryparam?.db || settingconfig.dbtype;
            const dbcon = `${dbpath}Database=${db}`;
            //throw new Error(`Conn: ${dbcon}`);
            const pool = await sqlpool.get(db,dbcon);      
      
		if (req.body){
			sqlquery = req.body.toString('utf-8');
		}

		if (sqlquery) {
			//sqlResult = [{'SQL':sqlquery}];
			sqlResult = await runsql.runSql(sqlquery, pool);
		}
            pool.close();    
	} catch(error)
        {           
		sqlResult = [{'Error':error.message}];
	}
	return res.status(200).json(sqlResult);
});

app.get('/test', async (req, res) => {
	let ret = [{'Data':'no result'}];
	try{
		var queryparam = url.parse(req.url, true).query;
            const sqlqrs = sqlqueries.Sqlqueries[queryparam?.q || 'item'];
		var query = sqlqrs.q;
		ret = [{'Query':query}];
	} catch(error)
        {           
		ret = [{'Error':error.message}];
	}
	return res.status(200).json(ret);
});

app.get('/error', async (req, res) => {
	let ret = [{'Data':'no result'}];
	try{
		var queryparam = url.parse(req.url, true).query;
            var q = queryparam?.q;
            var result = '';
            if (q=='test'){
                  var posterr = ["test error 1","test error 2"];
                  result = await func.submitError('test-error', authkey, `${BASEURL}${Errorurl}`, posterr, defaultfolderId);      
            }
		ret = [{'Result':result}];
	} catch(error)
        {           
		ret = [{'Error':error.message}];
	}
	return res.status(200).json(ret);
});

app.get('/batchprocess', async (req, res) => {
      var processok;
      var logfilename               = func.Logfilename('batchprocess');
      var queryparam 		      = url.parse(req.url, true).query;

      const logger = await loggerfunc.StartLogger(logfilename);
      const respjson = await func.fetchGet(Batchprocessurl, authkey, BASEURL);
      let result
      if(respjson?.ok){
            logger.log('info', JSON.stringify(respjson?.data)); 
            result = { ok: true, data: respjson?.data }
      }
      else{
            logger.log('error', `Error Code: ${respjson?.errorCode}, Error mesage: ${respjson?.errorMsg}`);
            result = { ok: false, errorCode: respjson?.errorCode, errorMsg: respjson?.errorMsg}
      }
      return res.status(200).json(result);
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});