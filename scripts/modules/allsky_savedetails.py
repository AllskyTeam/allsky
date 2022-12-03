""" allsky_savedetails.py

Part of allsky postprocess.py modules.
https://github.com/thomasjacquin/allsky

"""
import allsky_shared as s
import os 
import sqlite3

metaData = {
    "name": "Save Image Data",
    "description": "Saves Image Data",
    "module": "allsky_savedetails",       
    "version": "v1.0.0",        
    "events": [
        "day",
        "night"
    ]         
}

def createTable(connection, cursor):
    try:
        cursor.execute("SELECT * FROM images LIMIT 1")         
    except sqlite3.OperationalError:
        table = """ CREATE TABLE "images" (
            "filename"	TEXT,
            "folder"	TEXT,
            "exposure"	integer,
            "wbb"	REAL,
            "wbr"	REAL,
            "time"	INTEGER,
            "tod"	TEXT,
            "mean"	REAL,
            "brightness"	REAL,
            "gain"	REAL,
            "skystate"	INTEGER,
            "stars"	INTEGER,
            "meteors"	INTEGER
        ); """
        cursor.execute(table)
        #connection.commit()    

def addImageRecord(connection, cursor):
    imagePath = s.getEnvironmentVariable("CURRENT_IMAGE")
    imageFileName = os.path.basename(imagePath)

    folder = s.getEnvironmentVariable("DATE_NAME")

    exposure = int(s.getEnvironmentVariable("AS_EXPOSURE_US"))

    wbb = float(s.getEnvironmentVariable("AS_WBB"))
    wbr = float(s.getEnvironmentVariable("AS_WBR"))

    time = float(s.getEnvironmentVariable("AS_TIME"))
    tod = s.getEnvironmentVariable("DAY_OR_NIGHT")

    mean = float(s.getEnvironmentVariable("AS_MEAN"))
    brightness = float(s.getEnvironmentVariable("AS_BRIGHTNESS"))
    gain = float(s.getEnvironmentVariable("AS_GAIN"))

    skyState = s.getEnvironmentVariable("AS_SKYSTATE")
    if skyState == None:
        skyState = "Unknown"

    starCount = s.getEnvironmentVariable("AS_STARCOUNT")
    if starCount == None:
        starCount = 0
    else:
        if starCount.lower() == "disabled":
            starCount = 0
        else:
            starCount = int(starCount)

    meteorCount = s.getEnvironmentVariable("AS_METEORCOUNT")
    if meteorCount == None:
        meteorCount = 0
    else:
        if meteorCount.lower() == "disabled":
            meteorCount = 0
        else:
            meteorCount = int(meteorCount)

    query = "INSERT INTO images (filename, folder, exposure, wbb, wbr, time, tod, mean, brightness, gain, skystate, stars, meteors) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?);"
    cursor.execute(query, (imageFileName, folder, exposure, wbb, wbr, time, tod, mean, brightness, gain, skyState, starCount, meteorCount))
    #connection.commit()      

def savedetails(params, event):
    allSkyHome = s.getEnvironmentVariable("ALLSKY_HOME")
    dbPath = os.path.join(allSkyHome, "allsky.db")
    connection = sqlite3.connect(dbPath)

    cursor = connection.cursor() 

    createTable(connection, cursor)
    addImageRecord(connection, cursor)

    connection.commit()
    connection.close()

    return ""