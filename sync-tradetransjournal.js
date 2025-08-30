const func = require('./functions'); 
const fs = require('fs');  

async function syncTradeTrans(req, res, qrykey, baseurl, authkey, journalsubmiturl, configDataTradeTrans, sqlquery, LastSyncList, poolConnection, returnyes, defaultfolderId, logger, debug){
    try {

            const masterpayload             =   JSON.stringify(configDataTradeTrans.targetpayload);          
            const masterpayloaddata       =   JSON.stringify(configDataTradeTrans.transpayloaddata); 
            const masterpayloadcustom       =   JSON.stringify(configDataTradeTrans.transpayloadcustom); 
            const masterpayloadline         =   JSON.stringify(configDataTradeTrans.transpayloadline);
            const masterpayloadlineTF   
                =   JSON.stringify(configDataTradeTrans.transpayloadlinetaxfooter);
            const masterpayloadlineFD       =   JSON.stringify(configDataTradeTrans.transpayloadlinediscountfooter);
            const transcollookup            =   configDataTradeTrans.columnlookup;
            var transpayload, transpayloadline, transpayloadcustom, transpayloaddata, transpayloadtaxfooter, transpayloaddiscfooter;
            var transcolvar = [];
            var respjson, rowaction, errmsg, varAccNo, varDocNo;
            var successcount = 0, failedcount = 0, returnstatus = true, outputlog = [], inputDTarray=[], DocNoValues, DocNoLookupURL, insertedlog = [];

            /* NOTE:  Query's Doc Type = Invoice */
            const poolreq = await poolConnection.request();
            let resultSet = await poolreq.query(sqlquery);
            /*********** Variables *****************/
            var columnsobj = resultSet.recordset.columns, mcolcounter=0, dataarray, skipcount=0, linecounter = 0, taxidarray=[];        
            var fieldarr =  Object.keys(columnsobj);          
            var prevUDNo = '', prevXUDNo = '', prevAccNo = '', prevDT = '', mainPL=false, linescontainer = [], taxarrayindex, fldindex, docdiscount = 0, valueslist = '', lookupsearchval, submitflag=true;
            var DocNoAPILookupUrl = "/api/data/W8rfME7NRACoy0DxJ-kApw?find=%7B%22docno%22%3A%7B%22%24in%22%3A%5B", DocNoList=[];
            for(var i = 0; i < transcollookup.length;i++){ transcolvar.push(transcollookup[i]['column']);  }
            transpayload                    =   JSON.parse(masterpayload);          
            transpayloaddata                =   JSON.parse(masterpayloaddata); 
            transpayloadcustom              =   JSON.parse(masterpayloadcustom); 
            transpayloadline                =   JSON.parse(masterpayloadline);
            transpayloaddiscfooter          =   JSON.parse(masterpayloadlineFD);
            var rows = resultSet.recordset, colvalues, fetchedarray=[];
            var DocNoDoneList = [], LastDT = '';
            var Errorurl = '/api/post';

            /* Fetch ALL the DocNo values from rows */                
            DocNoValues = await func.fetchColumnValues(rows, 'Doc_No');           
            DocNoValues = DocNoValues.map(element => `"${element}"`);
            DocNoValues = encodeURIComponent(DocNoValues);
            DocNoLookupURL = `${DocNoAPILookupUrl}${DocNoValues}%5D%7D%7D&noLimit=true&folderId=${defaultfolderId}&allFolders=true&child=true&cols=docno,folder.code`;
            respjson = await func.fetchGet(DocNoLookupURL, authkey, baseurl);
            if(respjson?.ok){
                        for (let p of respjson?.data){
                                DocNoList.push({"docno":p['docno'], "foldercode":p['folder']['code']});
                        }
            }

            /* Fetch ALL xref */
            DocNoValues = rows.reduce((p, c) => {
                if (c.XDoc_No && !p.includes(c.XDoc_No)){
                    p.push(c.XDoc_No)
                }
                return p
            }, [])
            if (DocNoValues.length) DocNoValues = `"${DocNoValues.join('","')}"`
            DocNoValues = encodeURIComponent(DocNoValues);
            DocNoLookupURL = `/api/data/lines-ref?find=%7B%22docno%22%3A%7B%22%24in%22%3A%5B${DocNoValues}%5D%7D%7D&noLimit=true&folderId=${defaultfolderId}&allFolders=true&child=true&cols=id,docno,currency,lines`;
            respjson = await func.fetchGet(DocNoLookupURL, authkey, baseurl);
            let XDocList = {}
            if(respjson?.ok){
                for (let p of respjson?.data){
                    XDocList[p['docno']] = {"id":p['id'],"currency":p['currency'],"lines":p['lines']}
                }
            }

            /* Pre-Load Data*/
            for (let col of transcollookup){                    
                colvalues = [...new Set(rows.map( row => row[col['column']]  ) )];                
                colvalues = colvalues.filter(element => element !== null);                
                fetchedarray.push({"lookupcol":col['column'], "url": col['apipath'], "colvalues": colvalues, "matchfield": col['matchfield'], "returnfield":col['returnfield'], "selfmap":col['selfmap'], "selfmaparray": col['selfmaparray'], "respjson":null, "LookupFieldReturnNoValueAction": col['LookupFieldReturnNoValueAction']});   
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
            if(!returnyes)
            { console.log('Start Sync Trade Transaction'); }

            let checked = []
            /*
            for (let row of resultSet.recordset){
                if (!row) continue; 
                if(!func.CheckTradeJournalAlreadyExisted(row['OGCode'],row['Doc_No'], DocNoList))
                {      
                    rowaction = func.verifylookupfieldaction(fetchedarray, row,'tradetrans'); 
                    if(rowaction['proceed']){
                        checked.push(row['Doc_No'])      
                    }
                }
            }
            return res.status(200).json({res:DocNoList,rows:rows.length,proceed:checked});            
            */

            for (let row of resultSet.recordset){
                if (!row) continue; 
                if(!func.CheckTradeJournalAlreadyExisted(row['OGCode'],row['Doc_No'], DocNoList))
                {            
                            /* Insert InputDT into array list*/
                            if(!inputDTarray.includes(row['InputDT'])){
                                    inputDTarray.push(row['InputDT']);
                            }
                            rowaction = func.verifylookupfieldaction(fetchedarray, row,'tradetrans'); 
                            
                            
                            if(rowaction['proceed']){
                                        mcolcounter = 0;
                                        transpayloadline            = JSON.parse(masterpayloadline);              
                                        docdiscount += row['Z_ODisc']==null ? 0 : row['Z_ODisc'];
                                        mainPL = false;   
                                        checked.push(row['Doc_No'] +', prevUDNo:'+ prevUDNo+', submit:'+(submitflag ? 'Y' : 'N'))
                                        if(prevUDNo){
                                            if(prevUDNo != row['Doc_No']) {
                                                if(submitflag){
                                                    transpayload = func.processfooter(taxidarray, linecounter, masterpayloadlineTF, masterpayloadlineFD, linescontainer, docdiscount, transpayloaddata, transpayloadcustom, transpayload, prevXUDNo, XDocList );
                                                    respjson =  await func.submitMigrate(transpayload, authkey, `${baseurl}${journalsubmiturl}`,'tradetrans', null);
                                                    if(!respjson?.ok){
                                                        failedcount++;
                                                        returnstatus = false;
                                                        errmsg = `Sync Trade Transaction: Doc No: ${prevUDNo} Acc No: ${prevAccNo} , Error Code: ${respjson?.errorCode}, Error Message: ${respjson?.errorMsg}`;
                                                        if (debug) errmsg += `, Payload: ${JSON.stringify(transpayload)}`;
                                                        logger.log('info', errmsg);  
                                                        outputlog.push(errmsg);
                                                    }else{
                                                            if (LastDT < prevDT) LastDT = prevDT;
                                                            if(!DocNoDoneList.includes(prevUDNo)) DocNoDoneList.push(prevUDNo);
                                                            successcount++;
                                                            msg = `Success Inserted. DocNo: ${prevUDNo}, id: ${respjson?.data?.id}`;
                                                            logger.log('info', msg);                                                            
                                                            insertedlog.push(msg);
                                                    }
                                                }
                                                transpayload                    = JSON.parse(masterpayload);          
                                                transpayloaddata                = JSON.parse(masterpayloaddata);
                                                transpayloadcustom              = JSON.parse(masterpayloadcustom);
                                                mainPL = true;                        
                                                linecounter = 0;
                                                taxidarray = [];
                                                linescontainer = [];
                                                docdiscount = 0;
                                                prevUDNo = row['Doc_No'];
                                                prevAccNo = row['AccNo'];
                                                prevXUDNo = row['XDoc_No'];
                                                prevDT = row['InputDT'];
                                                submitflag = true;
                                            }
                                        }else{
                                                mainPL = true;
                                                prevUDNo = row['Doc_No'];
                                                prevAccNo = row['AccNo'];  
                                                prevXUDNo = row['XDoc_No'];                      
                                                prevDT = row['InputDT'];
                                        }
                                        linecounter++;
                                        transpayloadline[0]['value'] = linecounter;
                                        transpayloadline[0]['updated'] = true;
                                        for (let mcol of fetchedarray) {                     
                                            if(fieldarr.includes(mcol['lookupcol'])){
                                                    mcolcounter++;
                                                    paramval =  row[mcol['lookupcol']];             
                                                    respjson = null;
                                                    if(mcol['lookupcol']=='Tax1'){
                                                        returnfield = mcol['returnfield'];
                                                        indexlist = func.findMultiIndexbyKeyVal(mcol['matchfield'], row[mcol['lookupcol']], mcol['respjson']);
                                                        jsonrowindex = indexlist[0];
                                                        if(indexlist.length > 0){
                                                            if(!func.includesObjectWithKeyValue(taxidarray, "taxid",  mcol['respjson'][jsonrowindex][returnfield])){  
                                                                    taxidarray.push({"amountfields":["price","amount","nett"],"taxid":mcol['respjson'][jsonrowindex][returnfield], "amount":row['Tax1_Amount']==null ? 0 : row['Tax1_Amount']});
                                                            }else{
                                                                    taxarrayindex = func.findMultiIndexbyKeyVal("taxid", mcol['respjson'][jsonrowindex][returnfield], taxidarray);
                                                                    taxidarray[taxarrayindex]['amount']+= row['Tax1_Amount']==null ? 0 : row['Tax1_Amount'];
                                                            }
                                                        }                          
                                                    }
                                                    lookupsearchval = row[mcol['lookupcol']];
                                                    if(mcol['selfmap']){
                                                                if(mcol['selfmaparray'][row[mcol['lookupcol']]] )
                                                                { lookupsearchval = mcol['selfmaparray'][row[mcol['lookupcol']]]; }
                                                    }
                                                    if (mainPL) {       
                                                        transpayloaddata    =   func.populatelookuppayload(transpayloaddata, mcol, lookupsearchval, 'trans', defaultfolderId);
                                                        transpayloadcustom  =   func.populatelookuppayload(transpayloadcustom, mcol, lookupsearchval, 'trans', defaultfolderId);
                                                        transpayload        =   func.populatelookuppayload(transpayload, mcol, lookupsearchval, 'trans', defaultfolderId);
                                                    }
                                                    transpayloadline        =   func.populatelookuppayload(transpayloadline, mcol, lookupsearchval, 'trans', defaultfolderId); 
                                            }
                                        }
                                        if(mainPL){
                                            transpayloaddata                =    func.tradepopulaterowpayload(transpayloaddata, row, defaultfolderId);
                                            transpayloadcustom              =    func.tradepopulaterowpayload(transpayloadcustom, row, defaultfolderId);
                                            transpayload                    =    func.tradepopulaterowpayload(transpayload, row, defaultfolderId);
                                        }
                                        transpayloadline                    =   func.tradepopulaterowpayload(transpayloadline, row, defaultfolderId);
                                        dataarray = null;
                                        transpayloadline                    =   func.format_payload(transpayloadline, dataarray);
                                        linescontainer.push(transpayloadline);
                            }else{

                                            /* Submit previous Doc No block before proceed */
                                            if(prevUDNo){
                                                if(prevUDNo != row['Doc_No']) {
                                                    if(submitflag){
                                                        transpayload = func.processfooter(taxidarray, linecounter, masterpayloadlineTF, masterpayloadlineFD, linescontainer, docdiscount, transpayloaddata, transpayloadcustom, transpayload, prevXUDNo, XDocList );
                                                        respjson =  await func.submitMigrate(transpayload, authkey, `${baseurl}${journalsubmiturl}`,'tradetrans', null);
                                                        if(!respjson?.ok){
                                                            failedcount++;
                                                            returnstatus = false;
                                                            errmsg = `Sync Trade Transaction: Doc No: ${prevUDNo} Acc No: ${prevAccNo} , Error Code: ${respjson?.errorCode}, Error Message: ${respjson?.errorMsg}`;
                                                            if (debug) errmsg += `, Payload: ${JSON.stringify(transpayload)}`;
                                                            logger.log('info', errmsg);  
                                                            outputlog.push(errmsg);
                                                        }else{
                                                                if (LastDT < prevDT) LastDT = prevDT;
                                                                if(!DocNoDoneList.includes(prevUDNo)) DocNoDoneList.push(prevUDNo);
                                                                successcount++;
                                                                msg = `Success Inserted. DocNo: ${prevUDNo}, id: ${respjson?.data?.id}`;
                                                                logger.log('info', msg);                                                            
                                                                insertedlog.push(msg);
                                                        }
                                                    }
                                                    transpayload                    = JSON.parse(masterpayload);          
                                                    transpayloaddata                = JSON.parse(masterpayloaddata);
                                                    transpayloadcustom              = JSON.parse(masterpayloadcustom);
                                                    mainPL = true;                        
                                                    linecounter = 0;
                                                    taxidarray = [];
                                                    linescontainer = [];
                                                    docdiscount = 0;
                                                    prevUDNo = row['Doc_No'];
                                                    prevAccNo = row['AccNo'];
                                                    prevXUDNo = row['XDoc_No'];
                                                    prevDT = row['InputDT'];
                                                    submitflag = true;
                                                }
                                            }else{
                                                    mainPL = true;
                                                    prevUDNo = row['Doc_No'];
                                                    prevAccNo = row['AccNo']; 
                                                    prevXUDNo = row['XDoc_No'];                       
                                                    prevDT = row['InputDT'];
                                                }
                                            /**********/

                                            /* Log record */
                                            failedcount++;
                                            returnstatus = false;
                                            errmsg = `Sync Trade Transactions: OG Code: ${row['OGCode']}, DocNo: ${row['Doc_No']}, Error Message:  Fields that did not return any lookup values: ${rowaction['lookupfieldreturnnull'].toString()}`;
                                            logger.log('info', errmsg); 
                                            outputlog.push(errmsg); 
                                            submitflag = false;
                                            
                            }
                            varAccNo = row['AccNo'];
                            varDocNo = row['Doc_No']
                }else{
                    if (LastDT < row['InputDT']) LastDT = row['InputDT'];
                    if(!DocNoDoneList.includes(row['Doc_No'])) DocNoDoneList.push(row['Doc_No']);
                    skipcount++;
                }
            }

            if(inputDTarray.length >0 ){
                inputDTarray.sort((a, b) => new Date(b) - new Date(a));
            }
            /*
            if(returnstatus && inputDTarray[0]){
                    lastsyncupdate = func.updateJSONFile("./sync-settings/LastSync.json", "TradeTransLastSync", func.formatDate(inputDTarray[0]), fs)
            }
            */
            /* Last Doc No group for submission */
             checked.push('Final, prevUDNo:'+ prevUDNo+', submit:'+(submitflag ? 'Y' : 'N'))          
             if(submitflag && prevUDNo){
                transpayload = func.processfooter(taxidarray, linecounter, masterpayloadlineTF, masterpayloadlineFD, linescontainer, docdiscount, transpayloaddata, transpayloadcustom, transpayload, prevXUDNo, XDocList );           
                respjson =  await func.submitMigrate(transpayload, authkey, `${baseurl}${journalsubmiturl}`,'tradetrans',null);
                if(!respjson?.ok){
                            failedcount++;
                            returnstatus = false;
                            errmsg = `Sync Trade Transaction: Doc No: ${varDocNo} Acc No: ${varAccNo} , Error Code: ${respjson?.errorCode}, Error Message: ${respjson?.errorMsg}`;
                            if (debug) errmsg += `, Payload: ${JSON.stringify(transpayload)}`;
                            logger.log('info', errmsg);  
                            outputlog.push(errmsg);
                }else{
                    if (LastDT < prevDT) LastDT = prevDT;
                    if(!DocNoDoneList.includes(prevUDNo)) DocNoDoneList.push(prevUDNo);
                    successcount++;
                    msg = `Success Inserted. DocNo: ${prevUDNo}, id: ${respjson?.data?.id}`;
                    logger.log('info', msg);
                    insertedlog.push(msg);
                }
             }
            /* END Last Doc No group for submission */
            if (LastDT){
                func.updateJSONFile("./sync-settings/LastSync.json", "TradeTransDT_" + qrykey, LastDT, fs);                        
            }
            else if (DocNoDoneList.length>0){
                func.updateJSONFile("./sync-settings/LastSync.json", "TradeTransDocNo", DocNoDoneList.concat(LastSyncList || []), fs);                        
            }
          
            if(!returnyes) {
                if (outputlog.length){
                    let posterr = outputlog.filter(l => !l.includes('already exists'));
                    if (posterr && posterr.length){
                        await func.submitError('TradeTrans_' + qrykey, authkey, `${baseurl}${Errorurl}`, posterr, defaultfolderId);
                    }
                }      
                console.log('End Run'); 
            }
            let result = { ok: returnstatus, data: {success: successcount, info:insertedlog, fail: failedcount, skip:skipcount, Error: outputlog} }
            if (debug){
                    result.sqlquery = sqlquery  
                    result.checked = checked
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
        let result = { ok: false, data: error.message }
        if (debug){
            result.sqlquery = sqlquery  
        }
        if(returnyes){   
            return result;
        }
        else{
            return res.status(500).json(result);
        }
    }
}

module.exports = {
    syncTradeTrans: syncTradeTrans
};