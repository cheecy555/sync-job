const func = require('./functions');
const fs = require('fs'); 

async function syncItems(req, res, qrykey, baseurl, authkey, itemsubmiturl, configDataItem, sqlquery, poolConnection,returnyes, defaultfolderId, logger, debug){
      
        try{
                const masterpayload                     =   JSON.stringify(configDataItem.targetpayload); 
                const masteritemdata                    =   JSON.stringify(configDataItem.itemdata);
                const masteritemdatastart               =   JSON.stringify(configDataItem.itemdatastart);
                const masteritemdataend                 =   JSON.stringify(configDataItem.itemdataend);
                const masteritemdatapurchase            =   JSON.stringify(configDataItem.itemdatapurchase);
                const masteritemdatasale                =   JSON.stringify(configDataItem.itemdatasale);
                
                const collookup                         =   configDataItem.columnlookup;
                const poolreq                           =   await poolConnection.request();
                let resultSet                           =   await poolreq.query(sqlquery);  
              
                var columnsobj                          =   resultSet.recordset.columns;   
                var fieldarr                            =   Object.keys(columnsobj);
                var rows                                =   resultSet.recordset, colvalues, fetchedarray=[], valueslist, apiurl, respjson, idx, rowindex, errmsg;  
                var targetpayload, Itemdata, Itemdatastart, Itemdataend, Itemdatapurchase, Itemdatasale, rowaction, lookupsearchval;
                var successcount = 0, failedcount = 0, skipcount=0, returnstatus = true, outputlog = [], CodeValues, Barcodevalues, CodeLookupURL, CodeList = [];
                var logid='', hasrecord = false;
                var AccAPILookupUrl = "/api/data/GOG6SKeSTgGpgIereqO10Q?find=%7B%22code%22%3A%7B%22%24in%22%3A%5B";
                var Errorurl = '/api/post';

                 /* Fetch ALL the Code values from rows */                
                CodeValues = await func.fetchColumnValues(rows, 'Code');                
                Barcodevalues = await func.fetchColumnValues(rows, 'Barcode');
                if(Barcodevalues){ CodeValues = `${CodeValues},${Barcodevalues}`; }
                CodeValues = CodeValues.split(',');
                CodeValues = CodeValues.map(element => `"${element}"`);
                CodeValues = encodeURIComponent(CodeValues);
                CodeLookupURL = `${AccAPILookupUrl}${CodeValues}%5D%7D%7D&noLimit=true&cols=code`;
                respjson = await func.fetchGet(CodeLookupURL, authkey, baseurl);
                if(respjson?.ok){
                        for (let p of respjson?.data){
                                CodeList.push(p['code']);
                        }
                }
              
                /* Pre-Load Data*/
                for (let col of collookup){             
                        colvalues = [...new Set(rows.map( row => row[col['column']] ))]; 
                        colvalues = colvalues.filter(element => element !== null); 
                        fetchedarray.push({"lookupcol":col['column'], "url": col['apipath'], "colvalues": colvalues, "matchfield": col['matchfield'], "returnfield":col['returnfield'], "respjson":null, "LookupFieldReturnNoValueAction": col['LookupFieldReturnNoValueAction'],"selfmap":col['selfmap'], "selfmaparray":col['selfmaparray'] });  /* passed */ 
                }
                idx=0;
                for (let colarr of fetchedarray){
                                   valueslist = '';
                                   if(colarr['selfmap']){
                                       for (let values of colarr['colvalues']){
                                           if(colarr['selfmaparray'][values]){
                                                   valueslist += `"${colarr['selfmaparray'][values]}",`;
                                           }else{
                                                   valueslist += `"${values}",`;    
                                           }
                                       }
                                       valueslist = valueslist.slice(0, -1);
                                   }else{
                                           valueslist = colarr['colvalues'].map(element => `"${element}"`);
                                   }
                                  valueslist = encodeURIComponent(valueslist);   
                                  apiurl = `${colarr['url']}${valueslist}%5D%7D%7D&noLimit=true`;
                                  respjson = await func.fetchGet(apiurl, authkey, baseurl);
                                  if (respjson?.ok){
                                           fetchedarray[idx]['respjson'] = respjson?.data;
                                  }else{
                                         logger.log('error', `Error Code: ${respjson?.errorCode}, Error mesage: ${respjson?.errorMsg}`); 
                                  }
                                  idx++;
                }    
                /* END Pre-Load Data*/ 
                rowindex=0;
                if(!returnyes)
                { console.log('Start Sync Item'); }

                for (let row of resultSet.recordset){
                        if(!CodeList.includes(row['Code']) && !CodeList.includes(row['Barcode']) )
                        {
                                rowindex++;
                                targetpayload		=	JSON.parse(masterpayload);
                                Itemdata		=	JSON.parse(masteritemdata);
                                Itemdatastart		=	JSON.parse(masteritemdatastart);
                                Itemdataend             =       JSON.parse(masteritemdataend);
                                Itemdatapurchase        =       JSON.parse(masteritemdatapurchase);
                                Itemdatasale            =       JSON.parse(masteritemdatasale);

                             

                                rowaction = func.verifylookupfieldaction(fetchedarray, row, 'item' );
                                if(rowaction['proceed']){
                                        logid = row['ID'];
                                        hasrecord = true;
                                        for (let mcol of fetchedarray) {
                                                if(fieldarr.includes(mcol['lookupcol'])){ 
                                                        lookupsearchval = row[mcol['lookupcol']];
                                                        if(mcol['selfmap']){
                                                                if(mcol['selfmaparray'][row[mcol['lookupcol']]] )
                                                                { lookupsearchval = mcol['selfmaparray'][row[mcol['lookupcol']]]; }
                                                        }
                                                        targetpayload = func.populatelookuppayload(targetpayload, mcol, lookupsearchval, 'item', defaultfolderId);
                                                        Itemdatapurchase = func.populatelookuppayload(Itemdatapurchase, mcol, lookupsearchval, 'item', defaultfolderId);
                                                        Itemdatasale = func.populatelookuppayload(Itemdatasale, mcol, lookupsearchval, 'item', defaultfolderId);
                                                }
                                        }
                                        targetpayload           =   func.populaterowpayload(targetpayload, row, defaultfolderId);
                                        Itemdata                =   func.populaterowpayload(Itemdata, row, defaultfolderId);
                                        targetpayload           =   func.populatealternatefield(targetpayload, row);
                                        /* Formatting the JSON */
                                        Itemdatastart           =   func.format_payload(Itemdatastart, null);
                                        Itemdataend             =   func.format_payload(Itemdataend, null);
                                        Itemdatapurchase        =   func.format_payload(Itemdatapurchase, null);
                                        Itemdatasale            =   func.format_payload(Itemdatasale, null);
                                        dataarray               =   [{"itemdatastart":Itemdatastart,"itemdataend": Itemdataend, "itemdatapurchase":Itemdatapurchase, "itemdatasale": Itemdatasale}];
                                        Itemdata                =   func.format_payload(Itemdata, dataarray);
                                        dataarray               =   [{"itemdata":Itemdata}];
                                        targetpayload           =   func.format_payload(targetpayload, dataarray);
                                        respjson =  await func.submitMigrate(targetpayload, authkey, `${baseurl}${itemsubmiturl}`,'item',null);
                                        if(!respjson?.ok){
                                                failedcount++;
                                                returnstatus = false;
                                                errmsg = `Sync Item: Code: ${row['Code']}, Barcode: ${row['Barcode']} Error Code: ${respjson?.errorCode}, Error Message: ${respjson?.errorMsg}`;
                                                if (debug) errmsg += `, Payload: ${JSON.stringify(targetpayload)}`;
                                                logger.log('info', errmsg);  
                                                outputlog.push(errmsg);
                                        }else{
                                                successcount++;
                                        }
                                }else{
                                        /* Log record */
                                                failedcount++;
                                                returnstatus = false;
                                                errmsg = `Sync Item: Code: ${row['Code']}, Barcode: ${row['Barcode']}, Error Message: Fields that did not return any lookup values: ${rowaction['lookupfieldreturnnull'].toString()}`; 
                                                logger.log('info', errmsg);  
                                                outputlog.push(errmsg);
                                }
                        }else{
                                skipcount++;
                        }
                }
                if(!returnyes) {
                        if (outputlog.length){
                            let posterr = outputlog.filter(l => !l.includes('already exists'));
                            if (posterr && posterr.length){
                                await func.submitError('Item_' + qrykey, authkey, `${baseurl}${Errorurl}`, posterr, defaultfolderId);
                            }
                        }      
                        console.log('End Run'); 
                }
                /* IF return status = true, update Last Sync ID to LastSync.json log */
                if(returnstatus && logid!= ''){
                        lastsyncupdate = func.updateJSONFile("./sync-settings/LastSync.json", "ItemLastSync", logid, fs);
                }
                let result = { ok: returnstatus, data: {success: successcount, fail: failedcount, skip:skipcount, Error: outputlog } }
                if (debug){
                        result.sqlquery = sqlquery  
                }
                if(returnyes){   
                        return result;
                }
                else{
                        return res.status(200).json(result);
                }
        } catch(error)
        {           
                console.error("Error:", error);
                if(returnyes){   
                        return  { 
                                        ok: false, 
                                        data: error.message 
                                };
                }
                else{
                        return res.status(500).json({ 
                                ok:false,
                                error: error.message 
                        });
                }
        }
}

module.exports = {
        syncItems: syncItems
};