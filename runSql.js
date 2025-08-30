async function runSql(sqlquery, poolConnection){
      
        try{

                //let poolConnection                      =   await sql.connect(mssqlpath);  
                let poolreq                             =   await poolConnection.request();
                let resultSet                           =   await poolreq.query(sqlquery);  
                var rows                                =   resultSet.recordset;  
                poolConnection.close(); 
		return rows; 

		//return [{'Data':'no result'}];

        } catch(error)
        {       
		return [{'Error':error.message}];    
        }
}

module.exports = {
        runSql: runSql
};
