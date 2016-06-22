import praw, time, datetime, jsonpickle, requests, feedparser, re, sys, Levenshtein
from BeautifulSoup import BeautifulSoup


mturkpost = "None"
mturkgrindpost = "None"
mturkcrowdpost = "None"
oldHits = []
currentTitle = "None"
lastPost = ["None"]

class newpost:
	def __init__(self,title,url,utcTimestamp,source,html):
		self.title = title
		self.url = url
		self.utcTimestamp = utcTimestamp
		self.source = source
		self.html = html

def isDup(newHTML):
	global lastPost
	lowestVal = 1000
	for post in lastPost:
		#print(Levenshtein.distance(newHTML,post))
		levenVal = Levenshtein.distance(newHTML,post)
		if levenVal < lowestVal:
			lowestVal = levenVal
	print(lowestVal)
	if lowestVal < 400:
		return True
	else:
		return False

def addToLastPost(post):
	global lastPost
	lastPost.insert(0,post)
	if len(lastPost) > 10:
		lastPost.pop()

def mturkForumSearch():
	try:
		global mturkpost
		global lastPost
		feed = feedparser.parse('http://mturkforum.com/external.php?type=RSS2&forumids=30')
		url = feed.entries[0].link
		soup = BeautifulSoup(requests.get(url).content)
		posts = soup.findAll('div', {'class':re.compile('cms_table')})
		if len(posts) > 0:
			for post in posts[-1]:
				post = str(post).replace('"',"'")
				title = soup.find("font").text
				if post != mturkpost:
					if isDup(post) == True:
					    print("Duplicate detected")
					else:
					    print("MturkForum: New post was made \n ---------------------------------")
					    updateJsonFiles("New HIT from MturkForum.com. Check main notifier page for details", url,"mturkforum.com",post)
					    addToLastPost(post)
					mturkpost = post

	except Exception:
		print("An error has occured in mturkForumSearch")
			
def mturkgrindSearch():
	try:
		global mturkgrindpost
		global lastPost
		soupOne = BeautifulSoup(requests.get("http://mturkgrind.com").content)
		spans = soupOne.findAll('span', {'class':'lastThreadTitle'})
		url = "http://mturkgrind.com/" + spans[0].find('a')['href']
		soup = BeautifulSoup(requests.get(url).content)
		posts = soup.findAll('table', {'class':'ctaBbcodeTable'})
		if len(posts) > 0:
			post = posts[-1]
			post = str(post).replace('"',"'")
			if post != mturkgrindpost:
				if isDup(post) == True:
				    print("Duplicate detected")
				else:
				    print("MturkGrind: New post was made \n ---------------------------------")
				    updateJsonFiles("New HIT from MturkGrind.com. Check main notifier page for details", url,"mturkgrind.com",post)
				    addToLastPost(post)
				mturkgrindpost = post

	except Exception:
		print("An error has occured in mturkgrindSearch")

def mturkcrowdSearch():
	try:
		global mturkcrowdpost
		global lastPost
		soupOne = BeautifulSoup(requests.get("http://mturkcrowd.com").content)
		spans = soupOne.findAll('span', {'class':'lastThreadTitle'})
		url = "http://mturkcrowd.com/" + spans[0].find('a')['href']
		soup = BeautifulSoup(requests.get(url).content)
		posts = soup.findAll('table', {'class':'ctaBbcodeTable'})
		if posts != None and len(posts) > 0:
			post = posts[-1]
			post = str(post).replace('"',"'")
			if post != mturkcrowdpost:
				if isDup(post) == True:
				    print("Duplicate detected")
				else:
					print("MturkCrowd: New post was made \n ---------------------------------")
					updateJsonFiles("New HIT from MturkForum.com. Check main notifier page for details", url,"mturkcrowd.com",post)
					addToLastPost(post)
				mturkcrowdpost = post
	except Exception:
		print("An error has occured in mturkcrowdSearch")
	
def updateJsonFiles(title, url, source, html):
	try:
		if "projected" not in html.lower():
			global oldHits
			utcTimestamp = str(datetime.datetime.utcnow()) + "Z"
			currentJSON = open("post.json","w")
			currentJSON.truncate
			JSONObject = jsonpickle.encode(newpost(title,url, utcTimestamp, source, html))
			currentJSON.write(JSONObject)
			currentJSON.close()
		
			if len(oldHits) >= 15:
				del oldHits[0]
				
			oldHits.append(newpost(title,url, utcTimestamp, source, html))
			oldPosts = open('oldPosts.json','w')
			oldPosts.truncate
			oldPosts.write(jsonpickle.encode(oldHits))
			oldPosts.close()

	except Exception:
		print("An error occured while trying to update JSON files")

#### Reddit Configuration options ####
USERNAME = 'USERNAME'
PASSWORD = 'PASSWORD'
LIMIT = 1
SUBREDDIT = 'hitsworthturkingfor'
#### End Configuration Options ####

r = praw.Reddit(user_agent='Made by /u/retardeted to grab the latest hits from /r/hitsworthturkingfor')
r.login(USERNAME,PASSWORD, disable_warning=True)
alreadyDone = set()
print("Starting HITGrabber Scraper...\n")
while True:
    try:
        subreddit = r.get_subreddit(SUBREDDIT).get_new(limit=LIMIT)
        for post in subreddit:
            if post.id not in alreadyDone:
            	alreadyDone.add(post.id)
		updateJsonFiles("/r/hwtf: " + post.title,post.url,'/r/hitsworthturkingfor','none')
		print("HWTF: " + post.title + "\n ---------------------------------")

    except Exception:
        print("An error occured while getting hits from /r/hitsworthturkingfor")
    #mturkgrindSearch()
    mturkForumSearch()
    mturkcrowdSearch()
    time.sleep(30)
