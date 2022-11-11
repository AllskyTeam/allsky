""" allsky_cleanup.py

Part of allsky postprocess.py modules.
https://github.com/thomasjacquin/allsky

"""
import allsky_shared as s
import os
import sqlite3

metaData = {
    "name": "AllSKY Cleanup",
    "description": "Cleans up at the end of the night",
    "module": "allsky_cleanup",
    "experimental": "false",            
    "events": [
        "nightday",
        "daynight"
    ]         
}

def cleanupDB():
    allSkyHome = s.getEnvironmentVariable("ALLSKY_HOME")
    dbPath = os.path.join(allSkyHome, "allsky.db")

    if s.isFileReadable(dbPath):
        try:
            connection = sqlite3.connect(dbPath)

            imagesFolder = os.path.join(allSkyHome, "images")
            dirs = os.listdir(imagesFolder)
            dirStr = str = "','".join(dirs)

            sql = f"DELETE FROM images WHERE folder NOT IN('{dirStr}')"
            
            cursor = connection.cursor() 
            cursor.execute(sql)
            connection.commit()
            connection.close()
            s.log(1, "INFO: Details Database cleaned")
        except sqlite3.OperationalError:
            s.log(0, "ERROR: Could not open deltails database")
    else:
        s.log(1, "INFO: No details database found - skipping database cleanup")

def cleanup(params, event):

    cleanupDB()

    return "End of Nigh cleanup complete"