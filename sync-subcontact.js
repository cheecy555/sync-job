const func = require('./functions');
const fs = require('fs'); 
async function syncSubContacts(req, res, qrykey, baseurl, authkey, subcontactsubmiturl, configDataSubContact, sqlquery, poolConnection, defaultfolderId, returnyes, logger, debug){
        try{
                const masterpayload                     =   JSON.stringify(configDataSubContact.targetpayload);  
                const masterdata                        =   JSON.stringify(configDataSubContact.data);
                const masterdataphones                  =   JSON.stringify(configDataSubContact.dataphones);
                const masterdataemails                  =   JSON.stringify(configDataSubContact.dataemails);
                const masterdataaddress                 =   JSON.stringify(configDataSubContact.dataaddress);
                const mastertax                         =   JSON.stringify(configDataSubContact.tax); 
                const masterbank                        =   JSON.stringify(configDataSubContact.bank);
                const mastersite                        =   JSON.stringify(configDataSubContact.site);
                const masterwaGroup                     =   JSON.stringify(configDataSubContact.waGroup);
                const mastercustom                      =   JSON.stringify(configDataSubContact.custom);
                const mastersIQGQ                       =   JSON.stringify(configDataSubContact.XpxJxIlRFKu6XtOsIQGQ);
                const mastercustomvalue                 =   JSON.stringify(configDataSubContact.customvalue);
                const mastermain                        =   JSON.stringify(configDataSubContact.main);
                const contactidapiurl                   =   "/api/data/aIW4c7Q6RuaeePGydcyPzw?find=%7B%22acctcode%22%3A%7B%22%24in%22%3A%5B";
                const contactpersonapiurl               =   "/api/data/smgmysz1TwO0G47ZT-lB-g?find=%7B%22contactid%22%3A%7B%22%24in%22%3A%5B"
                const Errorurl                          =   '/api/post';
                const collookup                         =   configDataSubContact.columnlookup;
                const poolreq = await poolConnection.request();
                let resultSet = await poolreq.query(sqlquery);               
                var columnsobj = resultSet.recordset.columns;   
                var fieldarr =  Object.keys(columnsobj);        
                var rows = resultSet.recordset, colvalues, fetchedarray=[], valueslist, apiurl, respjson, idx, rowindex, skipcount=0, phonecontainer=[], dataarray, hasrecord=false;  
                var phonearray = [{"column":"Office_Phone", "type":"Work"},{"column":"House_Phone", "type":"Home"},{"column":"Mobile_Phone", "type":"Personal"},{"column":"Fax", "type":"Fax"}];  

                var targetpayload, subcontactdata, subcontactdataphones, subcontactdataemails, subcontactdataaddress, subcontacttax;
                var subcontactbank, subcontactsite, subcontactwaGroup, subcontactcustom, subcontactsIQGQ, subcontactcustomvalue, subcontactmain; 
                var rowaction, lookuparray, lookupmsgstr, accnovalues, accvalueslist, ContactIdArray, ContactPersonArray ,submiturl, fetchedid, contactidvalues, contactidvalueslist;
                var successcount = 0, failedcount = 0, logid='';
                var returnstatus = true, outputlog = [];

                /* Get the contact ids into array */
                accnovalues = [...new Set(rows.map( row => row['AccNo'] ))];
                accnovalues = accnovalues.filter(element => element !== null);
                accvalueslist = accnovalues.map(element => `"${element}"`);
                accvalueslist = encodeURIComponent(accvalueslist);
                ContactIdArray = await func.fetchGet(`${contactidapiurl}${accvalueslist}%5D%7D%7D&noLimit=true`, authkey, baseurl);
                
                /* Get the contact Persons into array */
                contactidvalues = ContactIdArray['data'].map(object => object.contactid);
                contactidvalues = contactidvalues.filter(element => element !== null);
                contactidvalueslist = contactidvalues.map(element => `"${element}"`);
                contactidvalueslist = encodeURIComponent(contactidvalueslist);
                ContactPersonArray = await func.fetchGet(`${contactpersonapiurl}${contactidvalueslist}%5D%7D%7D&noLimit=true&cols=contactid,contactperson,sitename`, authkey, baseurl);
                           
                /* Pre-Load Data*/
                for (let col of collookup){             
                        colvalues = [...new Set(rows.map( row => row[col['column']] ))];
                        colvalues = colvalues.filter(element => element !== null);
                        if(col['column']=='Country'){ colvalues = func.formatArrayStrings(colvalues);  }
                        fetchedarray.push({"lookupcol":col['column'], "url": col['apipath'], "colvalues": colvalues, "matchfield": col['matchfield'], "returnfield":col['returnfield'], "respjson":null, "LookupFieldReturnNoValueAction": col['LookupFieldReturnNoValueAction']});  /* passed */ 
                }
                idx=0;
                for (let colarr of fetchedarray){ 
                        valueslist = colarr['colvalues'].map(element => `"${element}"`);
                        valueslist = encodeURIComponent(valueslist);
                        apiurl = `${colarr['url']}${valueslist}%5D%7D%7D`;
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
                { console.log('Start Sync SubContact'); }
                for (let row of resultSet.recordset){
                        rowindex++;
                        phonecontainer = [];
                        targetpayload			=	JSON.parse(masterpayload);
                        subcontactdata                  =	JSON.parse(masterdata);       
                        subcontactdataphones            =	JSON.parse(masterdataphones);
                        subcontactdataemails            =	JSON.parse(masterdataemails);
                        subcontactdataaddress           =	JSON.parse(masterdataaddress);
                        subcontacttax                   =	JSON.parse(mastertax);
                        subcontactbank                  =	JSON.parse(masterbank);
                        subcontactsite                  =	JSON.parse(mastersite);
                        subcontactwaGroup               =	JSON.parse(masterwaGroup);
                        subcontactcustom                =	JSON.parse(mastercustom);
                        subcontactsIQGQ                 =	JSON.parse(mastersIQGQ);
                        subcontactcustomvalue           =	JSON.parse(mastercustomvalue);
                        subcontactmain                  =	JSON.parse(mastermain);

                        rowaction = func.verifylookupfieldaction(fetchedarray, row,'subcontact');
                        if(rowaction['proceed']){
                                
                                for (let mcol of fetchedarray) {
                                        if(fieldarr.includes(mcol['lookupcol'])){ 
                                                subcontactdata          = func.populatelookuppayload(subcontactdata, mcol, row[mcol['lookupcol']], 'subcontact');
                                                subcontactdataaddress   = func.populatelookuppayload(subcontactdataaddress, mcol, row[mcol['lookupcol']], 'subcontact');
                                        }
                                }
                                targetpayload           =   func.populaterowpayload(targetpayload, row);
                                subcontactdata          =   func.populaterowpayload(subcontactdata, row);
                                subcontactdataemails    =   func.populaterowpayload(subcontactdataemails, row);
                                subcontactdataaddress   =   func.populaterowpayload(subcontactdataaddress, row); 
                                subcontactsite          =   func.populaterowpayload(subcontactsite, row);
                                subcontactcustomvalue   =   func.populaterowpayload(subcontactcustomvalue, row);
                                if(subcontactdataemails == null){
                                        subcontactdata.splice(func.findMultiIndexbyKeyVal("key", "emails", subcontactdata)[0] ,1);
                                }
                                for (let ph of phonearray) {
                                        if(row[ph['column']]){
                                                subcontactdataphones     =   func.populatephonepayload(subcontactdataphones, row, ph['type']); 
                                                subcontactdataphones     =   func.format_payload(subcontactdataphones, null);
                                                phonecontainer.push(subcontactdataphones);
                                                subcontactdataphones	=	JSON.parse(masterdataphones);
                                        }
                                }                            
                                subcontactmain                          =       func.format_payload(subcontactmain,null);               
                                subcontactcustomvalue                   =       func.format_payload(subcontactcustomvalue,null);        
                                dataarray                               =       [{'customvalue': subcontactcustomvalue}];               
                                subcontactsIQGQ                         =       func.format_payload(subcontactsIQGQ,dataarray);         
                                dataarray                               =       [{'XpxJxIlRFKu6XtOsIQGQ': subcontactsIQGQ}];            
                                subcontactcustom                        =       func.format_payload(subcontactcustom,dataarray);        
                                subcontactwaGroup                       =       func.format_payload(subcontactwaGroup,null);            
                                subcontactsite                          =       func.format_payload(subcontactsite, null);              
                                subcontactbank                          =       func.format_payload(subcontactbank, null);              
                                subcontacttax                           =       func.format_payload(subcontacttax, null);               
                                subcontactdataaddress                   =       func.format_payload(subcontactdataaddress, null);       
                                if(subcontactdataemails){
                                        subcontactdataemails            =       func.format_payload(subcontactdataemails,null);         
                                }
                                subcontactdataphones                    =       func.format_payload(subcontactdataphones, null);        
                                dataarray                               =       [{'dataphones':phonecontainer, 'dataemails':[subcontactdataemails], 'dataaddress':subcontactdataaddress, 'tax':subcontacttax, 'bank':subcontactbank, 'site':subcontactsite, 'waGroup':subcontactwaGroup }];
                                subcontactdata                          =       func.format_payload(subcontactdata, dataarray);
                                dataarray                               =       [{'data':subcontactdata, 'custom':subcontactcustom, 'main':subcontactmain}];
                                targetpayload                           =       func.format_payload(targetpayload, dataarray);
                                fetchedid                               =       await func.fetchContactId(ContactIdArray, row['AccNo']);
                                if(fetchedid){
                                        if(!func.CheckSubContactPersonAlreadyExist(ContactPersonArray['data'], fetchedid, row['Contact'], row['Site_Name']))
                                        {
                                                logid = row['ID'];
                                                hasrecord = true;
                                                submiturl = subcontactsubmiturl.replace('[param]', fetchedid );
                                                respjson =  await func.submitMigrate(targetpayload, authkey, `${baseurl}${submiturl}`,'subcontact', defaultfolderId);
                                                if(!respjson?.ok){
                                                        failedcount++;                                                        
                                                        errmsg = `Sync Sub Contact. AccNo: ${row['AccNo']}, Error Code: ${respjson?.errorCode}, Error Message:  ${respjson?.errorMsg}`
                                                        if (debug) errmsg += `, Payload: ${JSON.stringify(targetpayload)}`;
                                                        logger.log('info', errmsg ); 
                                                        outputlog.push(errmsg); 
                                                        returnstatus = false;
                                                }else{
                                                        successcount++;
                                                }       
                                        }else{
                                                skipcount++;
                                        }
                                }else{
                                        failedcount++;
                                        returnstatus = false;
                                        errmsg = `Sync Sub Contact. AccNo: ${row['AccNo']}, Error Message: Account number did not return any contact id`;
                                        logger.log('info', errmsg );
                                        outputlog.push(errmsg); 
                                }
                                
                        }else{
                                /* Log record */
                                        lookupmsgstr = '';
                                        if(rowaction['lookupfieldreturnnull']){
                                                lookuparray = rowaction['lookupfieldreturnnull'];
                                                if(lookuparray.length > 0 ){
                                                        for (let l of lookuparray) {
                                                                        //if(row[l]){
                                                                                //lookupmsgstr  += `${l} - ${row[l]}`; 
                                                                                lookupmsgstr  += `${l},`; 
                                                                        //} else {
                                                                         //       lookupmsgstr  += `${l}`; 
                                                                       // }
                                                                        
                                                        }
                                                }
                                        }
                                        failedcount++;
                                        returnstatus = false;
                                        errmsg = `.[Sync Sub Contact. AccNo: ${row['AccNo']}, Error Message: Fields that did not return any lookup values: ${lookupmsgstr.slice(0, -1)}`; 
                                        logger.log('info', errmsg);  
                                        outputlog.push(errmsg);
                        }
                }
              
                 if(returnstatus && logid!= ''){
                    lastsyncupdate = func.updateJSONFile("./sync-settings/LastSync.json", "SubContactLastSync", logid, fs)
                 }
                 if(!returnyes) {
                        if (outputlog.length){
                                let posterr = outputlog.filter(l => !l.includes('already exists'));
                                if (posterr && posterr.length){
                                        await func.submitError('SubContact_' + qrykey, authkey, `${baseurl}${Errorurl}`, posterr, defaultfolderId);
                                }
                        }      
                        console.log('End Run'); 
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
        syncSubContacts: syncSubContacts
};