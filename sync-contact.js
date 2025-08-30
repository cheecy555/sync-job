const func = require('./functions');
const fs = require('fs'); 

async function syncContacts(req, res, qrykey, baseurl, authkey, contactsubmiturl, configDataContact, sqlquery, LastSyncList, poolConnection, returnyes, defaultfolderId, logger, debug){ 
        try{
                const masterpayload                     =   JSON.stringify(configDataContact.targetpayload); 
                const mastercontactdata                 =   JSON.stringify(configDataContact.contactdata);
                const masterInfodatablock               =   JSON.stringify(configDataContact.infodatablock);
                const masterInfodatablockmain           =   JSON.stringify(configDataContact.infosdatablockmain);
                const masterInfodatablockdetails        =   JSON.stringify(configDataContact.infosdatablockdetails);
                const masterInfodatablockaddr           =   JSON.stringify(configDataContact.infosdatablockaddress); 
                const masterInfodatablockemails         =   JSON.stringify(configDataContact.infosdatablockemails);
                const masterInfodatablockphones         =   JSON.stringify(configDataContact.infosdatablockphones);
                const masterInfodatablocktax            =   JSON.stringify(configDataContact.infosdatablocktax);
                const masterInfodatablocksite           =   JSON.stringify(configDataContact.infosdatablocksite);
                const masterInfodatablockbank           =   JSON.stringify(configDataContact.infosdatablockbank);
                const collookup                         =   configDataContact.columnlookup;
                var successcount = 0, failedcount = 0, skipcount = 0, returnstatus = true, outputlog = [];    
                const poolreq                           =   await poolConnection.request();            
                let resultSet = await poolreq.query(sqlquery);               
                var columnsobj = resultSet.recordset.columns;   
                var fieldarr =  Object.keys(columnsobj);        
                var rows = resultSet.recordset, colvalues, fetchedarray=[], valueslist, apiurl, respjson, idx, rowindex, phonecontainer=[], dataarray;  
                var phonearray = [{"column":"Office_Phone", "type":"Work"},{"column":"House_Phone", "type":"Home"},{"column":"Mobile_Phone", "type":"Personal"},{"column":"Fax", "type":"Fax"}];  
                var targetpayload, contactdata, Infodatablock, Infodatablockmain, Infodatablockdetails, Infodatablockaddr, Infodatablockmails;
                var Infodatablockphones, Infodatablocktax, Infodatablocksite, Infodatablockbank, rowaction, AccNoValues, hasrecord = false;
                var AccAPILookupUrl = "/api/data/aIW4c7Q6RuaeePGydcyPzw?find=%7B%22account.code%22%3A%7B%22%24in%22%3A%5B", AccNoLookupURL, AccNoList=[], Lastid=0;
                var AccNoDoneList = [];
                var Errorurl = '/api/post';

                /* Fetch ALL the AccNo values from rows */
                AccNoValues = [...new Set(rows.map( row =>  `"${row['AccNo']}"` ))];        
                AccNoValues = encodeURIComponent(AccNoValues);
                AccNoLookupURL = `${AccAPILookupUrl}${AccNoValues}%5D%7D%7D&noLimit=true&cols=account.code`;
                respjson = await func.fetchGet(AccNoLookupURL, authkey, baseurl);
                if(respjson?.ok){
                        for (let p of respjson?.data){
                                AccNoList.push(p['account']['code']);
                        }
                }

                /* Pre-Load Data*/
                for (let col of collookup){             
                        colvalues = [...new Set(rows.map( row => row[col['column']] ))];
                        colvalues = colvalues.filter(element => element !== null);
                        //if(col['column']=='Country'){ colvalues = func.formatArrayStrings(colvalues);  }
                        fetchedarray.push({"lookupcol":col['column'], "url": col['apipath'], "colvalues": colvalues, "matchfield": col['matchfield'], "returnfield":col['returnfield'], "respjson":null, "LookupFieldReturnNoValueAction": col['LookupFieldReturnNoValueAction']});  /* passed */ 
                }
                idx=0;
                for (let colarr of fetchedarray){ 
                        valueslist = colarr['colvalues'].map(element => `"${element}"`);
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
                { console.log('Start Sync Contact'); }
                for (let row of resultSet.recordset){                        
                        if(!AccNoList.includes(row['AccNo']))
                        {
                                rowindex++;
                                phonecontainer = [];
                                targetpayload			=	JSON.parse(masterpayload);
                                contactdata			=	JSON.parse(mastercontactdata);
                                Infodatablock			=	JSON.parse(masterInfodatablock);
                                Infodatablockmain		=	JSON.parse(masterInfodatablockmain);
                                Infodatablockdetails	        =	JSON.parse(masterInfodatablockdetails);
                                Infodatablockaddr		=	JSON.parse(masterInfodatablockaddr);
                                Infodatablockmails		=	JSON.parse(masterInfodatablockemails);
                                Infodatablockphones		=	JSON.parse(masterInfodatablockphones);
                                Infodatablocktax		=	JSON.parse(masterInfodatablocktax);
                                Infodatablocksite		=	JSON.parse(masterInfodatablocksite);
                                Infodatablockbank		=	JSON.parse(masterInfodatablockbank);
                                rowaction = func.verifylookupfieldaction(fetchedarray, row,'contact');
                                if(rowaction['proceed']){
                                        hasrecord = true;
                                        for (let mcol of fetchedarray) {
                                                if(fieldarr.includes(mcol['lookupcol'])){ 
                                                        targetpayload = func.populatelookuppayload(targetpayload, mcol, row[mcol['lookupcol']], 'contact', defaultfolderId);
                                                        Infodatablockaddr = func.populatelookuppayload(Infodatablockaddr, mcol, row[mcol['lookupcol']], 'contact', defaultfolderId);
                                                        Infodatablockdetails  = func.populatelookuppayload(Infodatablockdetails, mcol, row[mcol['lookupcol']], 'contact', defaultfolderId);
                                                }
                                        }
                                        targetpayload           =   func.populaterowpayload(targetpayload, row, defaultfolderId);
                                        contactdata             =   func.populaterowpayload(contactdata, row, defaultfolderId);
                                        Infodatablock           =   func.populaterowpayload(Infodatablock, row, defaultfolderId);
                                        Infodatablockdetails    =   func.populaterowpayload(Infodatablockdetails, row, defaultfolderId);
                                        Infodatablockaddr       =   func.populaterowpayload(Infodatablockaddr, row, defaultfolderId);
                                        Infodatablocksite       =   func.populaterowpayload(Infodatablocksite, row, defaultfolderId);
                                        Infodatablockbank       =   func.populaterowpayload(Infodatablockbank, row, defaultfolderId);
                                        targetpayload           =   func.matchvalueevaluate(targetpayload, row);
                                        Infodatablocktax        =   func.populaterowpayload(Infodatablocktax, row, defaultfolderId);
                                        Infodatablockmails      =   func.populaterowpayload(Infodatablockmails, row, defaultfolderId);
                                        if(Infodatablockmails == null){
                                                Infodatablockdetails.splice(func.findMultiIndexbyKeyVal("key", "emails", Infodatablockdetails)[0] ,1);
                                        }
                                        for (let ph of phonearray) {
                                                if(row[ph['column']]){
                                                        Infodatablockphones     =   func.populatephonepayload(Infodatablockphones, row, ph['type']); 
                                                        Infodatablockphones     =   func.format_payload(Infodatablockphones, null);
                                                        phonecontainer.push(Infodatablockphones);
                                                        Infodatablockphones	=	JSON.parse(masterInfodatablockphones);
                                                }
                                        }                         
                                        Infodatablockaddr                       =   func.format_payload(Infodatablockaddr,null);
                                        if(Infodatablockmails){
                                                Infodatablockmails              =   func.format_payload(Infodatablockmails,null);                            
                                        }
                                        Infodatablocktax                        =   func.format_payload(Infodatablocktax,null);
                                        Infodatablocksite                       =   func.format_payload(Infodatablocksite,null);
                                        Infodatablockbank                       =   func.format_payload(Infodatablockbank,null);
                                        dataarray                               =   [{'infosdatablockaddress':Infodatablockaddr,"infosdatablockemails": [Infodatablockmails], "infosdatablockphones":phonecontainer, "infosdatablocktax": Infodatablocktax, "infosdatablocksite": Infodatablocksite, "infosdatablockbank": Infodatablockbank }];
                                        Infodatablockdetails                    =   func.format_payload(Infodatablockdetails,dataarray);
                                        Infodatablockmain                       =   func.format_payload(Infodatablockmain, null);
                                        dataarray                               =   [{'infosdatablockmain': Infodatablockmain, 'infosdatablockdetails': Infodatablockdetails }];
                                        Infodatablock                           =   func.format_payload(Infodatablock, dataarray);
                                        contactdata                             =   func.format_payload(contactdata,null);
                                        dataarray                               =   [{'contactdata': contactdata, "infodatablock":[Infodatablock]}];
                                        targetpayload                           =   func.format_payload(targetpayload, dataarray);
                                        respjson =  await func.submitMigrate(targetpayload, authkey, `${baseurl}${contactsubmiturl}`,'contact',null);
                                        if(!respjson?.ok){
                                                failedcount++;
                                                returnstatus = false;
                                                errmsg =  `Sync Contact. AccNo: ${row['AccNo']}, ID: ${row['ID']}, LastID: ${Lastid}, Error Code: ${respjson?.errorCode}, Error Message: ${respjson?.errorMsg}`;
                                                if (debug) errmsg += `, Payload: ${JSON.stringify(targetpayload)}`;
                                                logger.log('info', errmsg);  
                                                outputlog.push(errmsg);
                                        }else{
                                                if (Lastid < row['ID']) Lastid = row['ID'];
                                                if(!AccNoDoneList.includes(row['AccNo'])) AccNoDoneList.push(row['AccNo']);
                                                successcount++;
                                        }
                                }else{
                                       /* Log record */
                                                failedcount++;
                                                returnstatus = false; 
                                                errmsg = `Sync Contact. AccNo: ${row['AccNo']}, Error Message: Fields that did not return any lookup values: ${rowaction['lookupfieldreturnnull'].toString()}`;                                    
                                                logger.log('info', errmsg);
                                                outputlog.push(errmsg);
                                }
                        }else{
                                if (Lastid < row['ID']) Lastid = row['ID'];
                                if(!AccNoDoneList.includes(row['AccNo'])) AccNoDoneList.push(row['AccNo']);
                                skipcount++;
                        }
                }
                if(!returnyes) {
                        if (outputlog.length){
                            let posterr = outputlog.filter(l => !l.includes('already exists'));
                            if (posterr && posterr.length){
                                await func.submitError('Contact_' + qrykey, authkey, `${baseurl}${Errorurl}`, posterr, defaultfolderId);
                            }
                        }      
                        console.log('End Run'); 
                }                
                /* IF return status = true, update Last Sync ID to LastSync.json log */
                /*
                if(returnstatus &&  logid!= ''){
                       lastsyncupdate = func.updateJSONFile("./sync-settings/LastSync.json", "ContactLastSync", logid, fs);
                }
                */
                if (Lastid){
                        func.updateJSONFile("./sync-settings/LastSync.json", "ContactID_" + qrykey, Lastid, fs);                        
                }
                else if (AccNoDoneList.length>0){
                        func.updateJSONFile("./sync-settings/LastSync.json", "ContactAccNo", AccNoDoneList.concat(LastSyncList || []), fs);                        
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
                        return { ok: false, data: error.message };
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
        syncContacts: syncContacts
};