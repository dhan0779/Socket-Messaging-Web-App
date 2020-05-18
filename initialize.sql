# drop existing procedure
DROP PROCEDURE IF EXISTS user_table; 
 
# change delimiter to $$ --> i.e. the statement terminator is changed to $$
DELIMITER $$ 
 
# name the procedure; this one will have no arguments
CREATE PROCEDURE user_table() 
BEGIN

CREATE TABLE users(username CHAR(20), PRIMARY KEY(username));
CREATE TABLE messages(username CHAR(20), message CHAR(200));

# statement (therefore, procedure) is over
END$$ 

# change the delimiter back to normal
DELIMITER ; 
