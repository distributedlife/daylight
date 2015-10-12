# Daylight

Daylight is a 2015 Australian disaster thriller package written by [Ryan Boucher](http://distributedlife.com) and starring [request](https://github.com/request/request), [bluebird](https://github.com/petkaantonov/bluebird/), [lodash](lodash.com), [moment](momentjs.com) and a cameo from [Pam Rucinque](https://twitter.com/PamRucinque).

# Plot

In "Your Project", a waste management firm (Splunk) loads barrels of app crashes onto an angular website, intending to help you deal with them. Cut to a scene of an app crash heading into Splunk MINT along with other crashes, including those from prior versions of your app. Meanwhile, a gang of developers, testers and a bevy of assorted project people use a browser to try to manage the rockfall by resolving the crashes from the old app.

At this point I stop trying to repurpose the plot from the movie Daylight and get to the point.

# TL;DR

The Splunk MINT dashboard isn't useful for classifying all errors that match a certain pattern and it doesnt symbolicate every error automatically. `Daylight` is a script that you can run. It'll get all your errors, symbolicate them if required and then lets you run matchers and resolvers.

A matcher is a string and if it's found in your stack trace then you can resolve it automatically with tags and a resolved version.

## Example

I worked on version 3.0.4 of the [Target Australia iPhone app](http://www.target.com.au). The prior version was 2.0.5 and that old version didn't have Splunk MINT support. Version 3.0.4 was a complete rewrite and none of the old code remained. The trouble was that when uesrs upgraded from 2.0.5 to 3.0.4, if their last experience on 2.0.5 was a crash –likely, then Splunk MINT would pickup the error and ship to us. The problem compounds because Splunk was using the version of the running app (3.0.4) and not the version of the crashing app (2.0.5).

We got a lot of errors on that first day that stumped us. The version was 3.0.4 but the symbols in the stack trace do not exist in our code base. We worked it out. Then we had to find a way to mark all these errors as resolved in 3.0.4. Then we realised that Splunk MINT wasn't going to work with us.

# TODO
[] Swap out contains with regex
[] Allow matches to be functions
[] Match only specific versions
[] Pick up cookie from login request
[] Remove global state and pass crap around from promise to promise