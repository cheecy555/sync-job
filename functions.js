
async function fetchGet(apiurl, auth, baseurl) {
    const res = await fetch(`${baseurl}${apiurl}`, {
        method: "GET",
        headers: {
                    'User-Agent': 'undici-stream-example', 
                    'Content-Type': 'application/json',
                    'User-Agent': 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 Edg/134.0.0.0', /* unneed */ 
                    'Upgrade-Insecure-Requests': 1,
                    'sec-ch-ua-platform':'Windows',
                    'sec-ch-ua': '"Chromium";v="134", "Not:A-Brand";v="24", "Microsoft Edge";v="134"',
                    'sec-ch-ua-mobile':'?0',                
                    'Authorization': `Bearer ${auth}`
                },       
         });
         var response = await res.json()            
         return response;
}

function findMultiIndexbyKeyVal(key, value, objarray){
    var outputarray = [];
    if(objarray){
            for(var i = 0; i < objarray.length;i++){
                    if(objarray[i][key]==value) { outputarray.push(i); }
            }
    }
    return outputarray;
}

function escapeJsonValue(value) {
    return value.replace(/"/g, '\\"');
  }


  function formatArrayStrings(arr) {
    return arr.map(str => {
      if (typeof str === 'string') {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
      }
      return str;
    });
  }


  function matchvalueevaluate(payload, row){
            let rowsrcflds, indexes;           
            rowsrcflds = findElementsbyKeyhasValue('lookupfield',payload);
            if(rowsrcflds){
                if(rowsrcflds.length > 0){
                    for (let p of rowsrcflds) {  
                            indexes = findMultiIndexbyKeyVal('lookupfield', p, payload);                         
                            if(indexes.length > 0){
                                    for (let e of indexes) 
                                    {
                                            if(row[payload[e]['lookupfield']] == payload[e]['matchvalue'])
                                            {  payload[e]['value'] = payload[e]['valueifmatch']; }
                                            payload[e]['updated']  = true;
                                    }
                            }                            
                    }
                }  
            }
            return payload;
}

function populatelookuppayload(payload, mcol, searchvalue, type, defaultfolderId){
    let index = findMultiIndexbyKeyVal("map", mcol['lookupcol'], payload); 
    let currentcoljson, matchfield, jsonrowindex, returnfield, indexlist, srchfound, updatevalue, founditemvalue = '';    
    currentcoljson = mcol['respjson'];
    matchfield = mcol['matchfield'];
    returnfield = mcol['returnfield'];

    if(index.length > 0){
             for (let pindex of index) { 
                            if(type=='contact' || type=='subcontact'){
                                    if(mcol['lookupcol']=='Country'){ searchvalue = formatArrayStrings([searchvalue])[0]; }
                            }

                            if(type=='trans' && mcol['lookupcol'] == 'Item' ){
                                    srchfound = false;
                                    for (let item of currentcoljson) {    
                                        if(item['item']['code'] == searchvalue){
                                               srchfound = true;
                                               founditemvalue = item['item']['id'];
                                        }
                                    }
                                    if(srchfound){
                                        indexlist = [1]; 
                                    }else{
                                        indexlist = [];
                                    }
                            }else{
                                indexlist = findMultiIndexbyKeyVal(matchfield, searchvalue, currentcoljson);
                                jsonrowindex = indexlist[0];
                            }

                            if(indexlist.length > 0){ 
                                    if(type=='trans' && mcol['lookupcol'] == 'Item' ){
                                                payload[pindex]['value'] = founditemvalue;
                                    }else{

                                            if(type=='subcontact' && mcol['lookupcol'] == 'Country' ){
                                                    updatevalue = escapeJsonValue(mcol['respjson'][jsonrowindex][ payload[pindex]['lookupsourcefield']]);
                                            }else{
                                                    updatevalue = escapeJsonValue(mcol['respjson'][jsonrowindex][returnfield]);
                                            }
                                            payload[pindex]['value'] = updatevalue;
                                    }
                            } else{
                                if ("defaultValueIfNull" in payload[pindex]){
                                            if(payload[pindex]['key'] == 'folderId')
                                            {  payload[pindex]['value']  = defaultfolderId;
                                              }else{
                                                payload[pindex]['value'] = payload[pindex]['defaultValueIfNull'];
                                            }
                                }else{
                                            payload[pindex]['value'] = null;
                                }
                            }
                            payload[pindex]['updated'] = true;              
             }
    }
    return payload;
}

function findElementsbyKeyhasValue(key, objArray){
    let valcols=[];
    if(objArray){
            for(var i = 0; i < objArray.length;i++){
                if(objArray[i][key]){
                    if(!valcols.includes(objArray[i][key])){
                            valcols.push(objArray[i][key]);
                    }
                }
            }
    }
    return valcols;
}

function format_payload(objpayload, datarray){    
    let outputarray={};     
    let colkey, colvalue, datamapstr, maparray, counter=0;
    let dataarr
    if(objpayload){
        if(objpayload.length > 0){
                for (let col of objpayload) {
                        colkey = col.key;
                        colvalue = col.value;
                        if(col.isdata){
                            datamapstr = col.datamap;
                            maparray = datamapstr.split(',');
                            if(maparray.length > 0 ){ 
                                if(maparray.length == 1 ) {
                                    if(datarray[0][datamapstr])
                                    { outputarray[colkey] = datarray[0][datamapstr];  }
                                }else{
                                    dataarr = [];
                                    for (let dm of maparray) {
                                        if(datarray[0][dm])
                                        { dataarr.push(datarray[0][dm]); }
                                    }
                                    outputarray[colkey] = dataarr;
                                }                           
                            }                        
                        }else{
                            outputarray[colkey]=colvalue; 
                        }
                        counter++;
                }            
        }
    }
    return outputarray;
}

function populatephonepayload(payload, row, type){
    if(type=='Work'){  payload[0]['value'] = row['Office_Phone']; }
    if(type=='Home'){ payload[0]['value'] = row['House_Phone'];  }
    if(type=='Personal'){ payload[0]['value'] = row['Mobile_Phone'];  }
    if(type=='Fax'){ payload[0]['value'] = row['Fax'];  }
    payload[0]['updated'] = true;
    payload[1]['updated'] = true;
    payload[1]['value'] = type;
    return payload;
}


async function  fetchContactId(ContactIdArray, accno){
    var foundid=null;
    for (let p of ContactIdArray['data']) {
        if(p['account']['code'] == accno){
            foundid = p['contactid'];
        }
    }
    return foundid;
}


async function submitMigrate(payloadbody, authkey, url, type, folderid){

    var headerarray;
    headerarray =   { 'User-Agent': 'undici-stream-example', 
                      'Content-Type': 'application/json',
                      'User-Agent': 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 Edg/134.0.0.0', /* unneed */ 
                      'Upgrade-Insecure-Requests': 1,
                      'sec-ch-ua-platform':'Windows',
                      'sec-ch-ua': '"Chromium";v="134", "Not:A-Brand";v="24", "Microsoft Edge";v="134"',
                      'sec-ch-ua-mobile':'?0',                
                      'Authorization': `Bearer ${authkey}`
                    };
    if(type == 'subcontact'){
        //headerarray.push({'folderId':folderid});
       headerarray['folderId'] = folderid; 
    }
    payloadbody = JSON.stringify(payloadbody);            
            const res = await fetch(`${url}`, {
                    method: "POST",
                    headers: headerarray,     
                    body: payloadbody  
            });
            var response = await res.json();          
            return response;
}

async function submitError(title, authkey, url, errors, folderId){
    var dt = (new Date()).toISOString();
    var payload = {
        "title": `Check Error - ${title}`,
        "duration": 5,
        "assignees": [],
        "watchers": [],
        "natures": [""],
        "teamid": null,
        "type": "4EOVTcjgRoSQT1U8ChD6bQ",
        "anytime": false,
        "confidential": false,
        "folderId": folderId,
        "data": {
            "start": {
                "time": dt
            },
            "crmapp": true,
            "instruction": JSON.stringify(errors),
            "hideNotes": false,
            "hideServicingNotes": false,
            "priority": 0,
            "balance": 0,
            "c10L": false,
            "anytime": false,
            "collect": false,
            "interval": "M",
            "pref": 0,
            "schedule": dt,
            "allday": false,
        },
        "plan": dt
    }
    return await submitMigrate(payload, authkey, url, 'error', folderId);
}

function populatealternatefield(payload, queryrow){
        var pldindexwithselection =  findMultiIndexbyKeyVal("fieldselection", true, payload);
        if(pldindexwithselection.length > 0){
                    for (let p of pldindexwithselection) {
                            if(payload[p]['fieldselection']){
                                if(queryrow[payload[p]['primaryfield']] == null){
                                    payload[p]['value'] = queryrow[payload[p]['alternatefield']];
                                }else{
                                    payload[p]['value'] = queryrow[payload[p]['primaryfield']];
                                }
                                payload[p]['updated'] = true;
                            }
                    }
        }
        return payload;
}


function populaterowpayload(payload, queryrow, defaultfolderId){
        let rowsrcflds, pindex, fieldsarr, fieldvalue, payloadnull = false, nulify, nulifyindex, nulifyfields, returnnull = false;
        /* Check if payload block contains key 'NulifyPayloadWithFieldsNull', if yes, check the availabilities of the fields */
        nulify = findElementsbyKeyhasValue('NulifyPayloadWithFieldsNull',payload);
        if(nulify.length > 0 ){            
            nulifyindex = findMultiIndexbyKeyVal("NulifyPayloadWithFieldsNull", true, payload)[0];
            nulifyfields = payload[nulifyindex]['fields'];
            nulifyfields.map(field => {
                    if(queryrow[field] == null){                        
                        returnnull = true;
                        payload = null;
                    }
            });
        }
        if(!returnnull){
            rowsrcflds = findElementsbyKeyhasValue('rowsourcefield',payload);
            if(rowsrcflds.length > 0){
                    for (let p of rowsrcflds) {
                        pindex = findMultiIndexbyKeyVal("rowsourcefield", p, payload);
                        if(pindex.length > 0){
                                for (let id of pindex) {
                                        if(payload[id]['valuemapping']){
                                                if(payload[id]['mappingsoptions']){
                                                        payload[id]['value'] =  payload[id]['mappingsoptions'][queryrow[p]];
                                                        payload[id]['updated'] = true; 
                                                }
                                        }else{
                                                if(p.includes(",")){
                                                        fieldsarr = p.split(','); 
                                                        if(fieldsarr.length > 0 ){
                                                            fieldvalue = '';
                                                            for (let f of fieldsarr) {
                                                                    f=f.trim();
                                                                    if(queryrow[f]){
                                                                            fieldvalue = fieldvalue.concat(queryrow[f], ' ');
                                                                    }
                                                            }
                                                            fieldvalue = fieldvalue.trim();
                                                            payload[id]['value'] = fieldvalue;
                                                        }
                                                }else{
                                                        if(queryrow[p]){
                                                            if(p=='Country'){ 
                                                                fieldvalue = queryrow[p];
                                                                fieldvalue = formatArrayStrings([fieldvalue])[0]; 
                                                            }else{
                                                                fieldvalue = queryrow[p];
                                                            }
                                                            payload[id]['value'] = fieldvalue; 
                                                        }else{
                                                            if ("defaultValueIfNull" in payload[id]){
                                                                    if(payload[id]['key']=='folderId'){
                                                                            payload[id]['value'] =  defaultfolderId;
                                                                    }else{
                                                                            payload[id]['value'] = payload[id]['defaultValueIfNull'];
                                                                    }
                                                            }else{    
                                                                    payload[id]['value'] = null;
                                                            }
                                                        }
                                                }
                                                if(!payloadnull)
                                                { payload[id]['updated'] = true; }
                                        }
                                }
                            }
                    }
            }
    }
    return payload;
}

function includesObjectWithKeyValue(array, key, value) {
    return array.some(obj => obj.hasOwnProperty(key) && obj[key] === value);
}

function tradepopulaterowpayload(payload, queryrow, defaultfolderId){
	let rowsrcflds, pindex, sumfields, deductfields, totalvalue=0;
	rowsrcflds = findElementsbyKeyhasValue('rowsourcefield',payload);
        if(rowsrcflds.length > 0){
          for (let p of rowsrcflds) {
                   pindex = findMultiIndexbyKeyVal("rowsourcefield", p, payload);
                   if(pindex.length > 0){
                          for (let id of pindex) {
                                if(payload[id]['calculated']){
                                    sumfields = payload[id]['sum'];
                                    for (let s of sumfields) {
                                        totalvalue += queryrow[s] == null ? 0: queryrow[s] ;
                                    }
                                    deductfields = payload[id]['deduct'];
                                    for (let s of deductfields) {
                                        totalvalue -= queryrow[s] == null ? 0: queryrow[s] ;
                                    }
                                    payload[id]['value'] = totalvalue;
                                }else{
                                   if(queryrow[p]){
                                        payload[id]['value'] = queryrow[p]; 
                                   }else{
                                    if ("defaultValueIfNull" in payload[id]){   
                                            if(payload[id]['key']=='folderId'){
                                                    payload[id]['value'] = defaultfolderId;
                                            }else{
                                                payload[id]['value'] = payload[id]['defaultValueIfNull'];
                                            }
                                        }else{
                                            payload[id]['value'] = null;
                                        }
                                   }
                                }
                                payload[id]['updated'] = true;
                          }
                   }
          }
       }
	    return payload;
}

function processfooter(taxidarray, linecounter, masterpayloadlineTF, masterpayloadlineFD, linescontainer, docdiscount, transpayloaddata, transpayloadcustom, transpayload, XDoc, XDocList){
    var fldindex;
    /* With XDoc, e.g. debit note, credit note */
    if(XDoc){
        let lst = XDocList ? XDocList[XDoc] : {} 
        //throw new Error(`XDoc: ${XDoc}=${JSON.stringify(lst)}, lines: ${JSON.stringify(linescontainer)}`)
        let parent ={
            id: 1,
            qty: 1,
            xref: lst?.id || 'AAAAAAAAAAAAAAAAAAAAAA',
            price: 0,
            amount: 0,
            data: {
              toggle: 1,
              seq: "1"
            },
            nett: 0,
            description: "",
            rate: 0,
            tax: 0,
            disc: 0
        }
        let sign = 0
        for (const l of linescontainer) {
            sign += l.nett
        }
        sign = sign < 0 ? -1 : 1
        let desc = ''
        for (const l of linescontainer) {
            let xref
            if (lst?.lines){
                for (const x of lst.lines) {
                    if (l.acctid==x?.item?.id || l.acctid==x?.account?.id){
                        xref = x.id
                        desc = desc + (l?.description?.length>0 && desc.length>0 ? ' ' : '') + (l?.description || '')
                        break
                    }
                    else if(l.description==x.description){
                        xref = x.id
                        desc = desc + (l?.description?.length>0 && desc.length>0 ? ' ' : '') + (l?.description || '')
                        break
                    }
                }
            }
            if (!xref){
                xref= (lst && lst?.lines?.length>0 ? lst.lines[0].id : 'AAAAAAAAAAAAAAAAAAAAAA')
                if (!desc) desc = (l.description || '')
            }

            l.id +=1
            l.parentId = 1
            l.data = l.data || {}
            l.xref = xref
            l.data.seq = `1.${l.id}`
            l.data.xref = xref
            l.data.toggle = 1

            l.price = l.price*sign
            l.amount = l.amount*sign
            l.nett = l.nett*sign
            l.tax = l.tax*sign
            l.disc = l.disc*sign

            parent.price += l.price ?? 0
            parent.amount += l.amount ?? 0
            parent.nett += l.nett ?? 0
            parent.tax += l.tax ?? 0
            parent.disc += l.disc ?? 0
            parent.description = desc
        }
        linescontainer.unshift(parent)
    }
    else{
        /* Tax footer */
        if (taxidarray && taxidarray.length >0){
            for (let t of taxidarray){
                linecounter++;
                transpayloadtaxfooter                   =   JSON.parse(masterpayloadlineTF);
                transpayloadtaxfooter[0]['value']       =   linecounter;
                transpayloadtaxfooter[0]['updated']     =   true;
                transpayloadtaxfooter[1]['value']       =   t['taxid'];
                transpayloadtaxfooter[1]['updated']     =   true;
                for (let f of t['amountfields']){ 
                            fldindex = findMultiIndexbyKeyVal("key", f, transpayloadtaxfooter); 
                            transpayloadtaxfooter[fldindex[0]]['value']       =   t['amount'];
                            transpayloadtaxfooter[fldindex[0]]['updated']     =   true;
                }
                transpayloadtaxfooter = format_payload(transpayloadtaxfooter, null);
                linescontainer.push(transpayloadtaxfooter);
            }
        }
        /* Discount Footer */
        if (docdiscount){
            linecounter++;
            transpayloaddiscfooter                  =       JSON.parse(masterpayloadlineFD);
            transpayloaddiscfooter[0]['value']      =       linecounter;
            transpayloaddiscfooter[0]['updated']    =       true;
            transpayloaddiscfooter[2]['value']      =       docdiscount;
            transpayloaddiscfooter[2]['updated']    =       true;
            transpayloaddiscfooter[4]['value']      =       docdiscount;
            transpayloaddiscfooter[4]['updated']    =       true;
            transpayloaddiscfooter[7]['value']      =       docdiscount;
            transpayloaddiscfooter[7]['updated']    =       true;
            transpayloaddiscfooter = format_payload(transpayloaddiscfooter, null);
            linescontainer.push(transpayloaddiscfooter);
        }            
    }

    transpayloaddata        =    format_payload(transpayloaddata, null);
    transpayloadcustom     =    format_payload(transpayloadcustom, null);
    dataarray              =    [{'transpayloaddata':transpayloaddata, 'transpayloadcustom':transpayloadcustom,"transpayloadline": linescontainer}];
    transpayload          =    format_payload(transpayload, dataarray);
    return transpayload;
}

function capitalizeFirstLetter(str) {
  if (!str) {
    return ""; // Handle empty strings to prevent errors
  }
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function verifylookupfieldaction(arraydata, row, type ){  
        var proceed = true, lookupfieldnullvalue=[], lookupfieldreturnnull = [], idx, searchval, itemfound = false;
        for (let mcol of arraydata) {
                if( mcol['LookupFieldReturnNoValueAction'] == 'Log'){                    
                    /* Check the lookup value is NULL or response json to see any return value match the lookup value */
                    searchval = row[mcol['lookupcol']];
                    if(searchval != null){
                        if(mcol['selfmap']){
                            if(mcol['selfmaparray']){
                                    if(mcol['selfmaparray'][searchval]){
                                        searchval = mcol['selfmaparray'][searchval];
                                    }
                            }
                        }
                        /*
                        if( (type=='contact' || type=='subcontact' ) && mcol['lookupcol'] =='Country'){
                            searchval = capitalizeFirstLetter(searchval);
                        }
                        */
                        if(type == 'tradetrans'){
                              if(mcol['lookupcol'] == 'Item'){
                                     for (let itemjson of mcol['respjson']){
                                            if(itemjson['item']['code'] == searchval)
                                            { idx=[1]; }
                                     }
                              } else{
                                    idx = findMultiIndexbyKeyVal(mcol['matchfield'], searchval, mcol['respjson']);  
                              } 
                        }else{
                            idx = findMultiIndexbyKeyVal(mcol['matchfield'], searchval, mcol['respjson']);
                        }
                        if(idx.length == 0){
                                proceed = false;
                                lookupfieldreturnnull.push(`${mcol['lookupcol']}(value: ${row[mcol['lookupcol']]})`);
                        }
                    }
                }
        }
        return {"proceed": proceed, "lookupfieldreturnnull": lookupfieldreturnnull };
}

function Logfilename(type){
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const formattedDate = `${day}${month}${year}`;

        let hours = date.getHours();
        let minutes = date.getMinutes();
        let x = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12;
        hours = hours ? hours : 12;
        minutes = minutes.toString().padStart(2, '0');
        let mergeTime = hours + '' + minutes + '' + x;

        if(type=='item'){
            return `SyncItem-${formattedDate}-${mergeTime}.log`;
        }
        if(type=='contact'){
            return `SyncContact-${formattedDate}-${mergeTime}.log`;
        }
        if(type=='subcontact'){
            return `SyncSubContact-${formattedDate}-${mergeTime}.log`;
        }
        if(type=='tradetrans'){
            return `SyncTradeJournal-${formattedDate}-${mergeTime}.log`;
        }
        if(type=='all'){
            return `All-${formattedDate}-${mergeTime}.log`;
        }
}

function CheckSubContactPersonAlreadyExist(ContactPersonArray, contactdid,contactname, sitename ){
        var contactidindexlist, existed = false, arraysitename, arraycontactperson;
        contactname =   contactname == null ? '' : contactname;
        sitename    =   sitename == null ? '' : sitename;
        contactidindexlist = findMultiIndexbyKeyVal('contactid', contactdid, ContactPersonArray);
        for (let ph of contactidindexlist) {
                arraysitename       =   ContactPersonArray[ph]['sitename']==null?'':ContactPersonArray[ph]['sitename'];
                arraycontactperson  =   ContactPersonArray[ph]['contactperson']==null?'':ContactPersonArray[ph]['contactperson'];
                if(arraysitename == sitename && arraycontactperson == contactname ){
                    existed = true;
                }
        }
        return existed;
}


function GenerateTrxDT_Placeholder(type, trxDTFrom, trxDTTo){
        if(type=='tradetrans'){
                    if(trxDTFrom){
                            if(trxDTTo){
                                return ` (TXDT.TrxDT BETWEEN '${trxDTFrom}' AND '${trxDTTo}') AND `;
                            }else{
                                return ` (TXDT.TrxDT >= '${trxDTFrom}') AND `;
                            }
                    }else{
                            if(trxDTTo){
                                 return ` (TXDT.TrxDT <= '${trxDTTo}') AND `;
                            }else{
                                return '';
                            }
                    }
        }
}


function GenerateLastSync_placeholder(type, LastSync, LastSyncInclude){

    var SyncInclude = '', LastSyncDT = '', SyncReturn = '', lastsyncfield = '', andstr = '', quotestr = '';
    if(type=='tradetrans' || type=='item' || type=='contact' || type=='subcontact'){
                if(type=='tradetrans') {  
                    lastsyncfield = 'InputDT'; 
                    andstr = ' AND ';
                    quotestr = `'`;
                } 
                if(type=='item' || type=='contact' ) {  lastsyncfield = 'ID'; } 
                if(type == 'subcontact') { lastsyncfield = 'AML.ID'; }
                if(type=='contact' || type=='subcontact') {   andstr = ' AND '; }
                if(LastSyncInclude){
                      SyncInclude = ` (${LastSyncInclude}) `;
                }
                if(LastSync){   
                      LastSyncDT   =   ` (${lastsyncfield} > ${quotestr}${LastSync}${quotestr}) `;
                }
                if(SyncInclude && LastSyncDT){
                        SyncReturn = ` ( ${SyncInclude} OR ${LastSyncDT} ) ${andstr} `;
                }else{
                        if(SyncInclude){
                                SyncReturn = ` ${SyncInclude} ${andstr} `;
                        }
                        if(LastSyncDT){
                                SyncReturn = ` ${LastSyncDT} ${andstr} `;
                        }
                }
                if(type=='item'){
                    if(SyncInclude || LastSyncDT){
                        SyncReturn = ` WHERE ${SyncReturn} `;
                    }
                }
    }
    return SyncReturn;
}

function updateJSONFile(filePath, key, newValue, fs) {
  try {
    // Read the JSON file
    const fileData = fs.readFileSync(filePath, 'utf8');
    // Parse the JSON data
    const jsonData = JSON.parse(fileData);
    // Update the value of the specified key
    jsonData[key] = newValue;
    // Stringify the updated JSON data
    const updatedJsonData = JSON.stringify(jsonData, null, 2);
    // Write the updated JSON data back to the file
    fs.writeFileSync(filePath, updatedJsonData);
    //console.log(`Successfully updated key "${key}" to "${newValue}" in ${filePath}`);
    return {ok:true};
  } catch (error) {
    console.error("An error occurred:", error);
     return {ok:false};
  }
}
  
function formatDate(timestamp) {
  const date = new Date(timestamp);
  const day = String(date.getDate()).padStart(2, '0');
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

async function fetchColumnValues(data, columnName) {
  try {
    if (!Array.isArray(data)) {
      throw new Error("Data must be an array of objects.");
    }

    const values = data
      .map(row => row[columnName])
      .filter(value => value !== null && value !== '' && value !== undefined);

    return values;
  } catch (error) {
    console.error("Error fetching column values:", error.message);
    throw error;
  }
}


function CheckTradeJournalAlreadyExisted(foldercode,docno, DocNoList){
        var found = false;
        if(DocNoList){
            for (let row of DocNoList){
                    if(docno == row['docno'] && foldercode == row['foldercode']){
                        found=true;
                    }
            }
        }
        return found;
}
module.exports = {
    fetchGet: fetchGet,
    findMultiIndexbyKeyVal: findMultiIndexbyKeyVal,
    escapeJsonValue: escapeJsonValue,
    formatArrayStrings: formatArrayStrings,
    matchvalueevaluate: matchvalueevaluate,
    populatelookuppayload: populatelookuppayload, 
    findElementsbyKeyhasValue: findElementsbyKeyhasValue,
    format_payload: format_payload,
    populatephonepayload: populatephonepayload,
    submitMigrate: submitMigrate,
    submitError: submitError,
    populaterowpayload: populaterowpayload,
    includesObjectWithKeyValue: includesObjectWithKeyValue,
    tradepopulaterowpayload: tradepopulaterowpayload,
    processfooter: processfooter,
    populatealternatefield: populatealternatefield,
    verifylookupfieldaction: verifylookupfieldaction,
    capitalizeFirstLetter: capitalizeFirstLetter,
    fetchContactId: fetchContactId,
    Logfilename: Logfilename,
    CheckSubContactPersonAlreadyExist: CheckSubContactPersonAlreadyExist,
    GenerateTrxDT_Placeholder, GenerateTrxDT_Placeholder,
    GenerateLastSync_placeholder: GenerateLastSync_placeholder,
    updateJSONFile: updateJSONFile,
    formatDate: formatDate,
    fetchColumnValues: fetchColumnValues,
    CheckTradeJournalAlreadyExisted: CheckTradeJournalAlreadyExisted
};