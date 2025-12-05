To run the project:

figure out a way to change directory to backend folder so it looks like this
PS C:\Users\fara7\OneDrive\Desktop\GENO\genoproject\backend> 

جربي بدون هذول الاثنين اول
# Create new venv
python -m venv venv

# Activate it
.\venv\Scripts\Activate.ps1
============

#2 Install dependencies
pip install -r requirements.txt

#3 run db_setup to make the tables
python DB/db_setup.py

# run create_test_users.py to make 3 users
python create_test_users.py

#4 run the flask api
python app.py


backend should start and can be tested through postman or see the content through pgAdmin

to delete all reports from database:
go to pgAdmin, sql query and type this

TRUNCATE TABLE Reports CASCADE;





Gas@tank90