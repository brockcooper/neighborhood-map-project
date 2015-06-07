// TODO: 
// Get Foursquare Data -- Monday
// Figure out which data to display and how to display it -- Monday
// Info Window -- Tues
// Sidebar -- Thurs
// Make detailed README -- Fri

function appViewModel() {
    var self = this;
    var city, mapOptions, map, input, searchBox;

    // Create array that will populate the sidebar and keep track of Google Places and Yelp
    this.googlePlacesMarkers = ko.observableArray();

    //initialize Google Maps variables
    // Start out with Salt Lake City
    city = new google.maps.LatLng(40.7500, -111.8833);
    mapOptions = {
        center: city,
        zoom: 12,
        zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_BOTTOM,
            style: google.maps.ZoomControlStyle.SMALL
        },
        streetViewControlOptions: {
            position: google.maps.ControlPosition.LEFT_BOTTOM
        },
        mapTypeControl: false,
        panControl: false
    };
    map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
    input = (document.getElementById('pac-input'));
    searchBox = new google.maps.places.SearchBox((input));

    // Set Google Place Markers into the googlePlacesMarkers observable array
    var setMarker = function(place) {
      var image = {
                url: place.icon,
                size: new google.maps.Size(71, 71),
                origin: new google.maps.Point(0, 0),
                anchor: new google.maps.Point(17, 34),
                scaledSize: new google.maps.Size(25, 25)
            };
            // Create a marker for each place.
            var marker = new google.maps.Marker({
                map: map,
                icon: image,
                title: place.name,
                position: place.geometry.location
            });

            self.googlePlacesMarkers.push(marker);
    }

    // Clears out map
    var cleargooglePlacesMarkers = function () {
      for (var i = 0, marker; marker = self.googlePlacesMarkers()[i]; i++) {
        marker.setMap(null);
      }
    }

    // Set the bounds of the map after you search
    var setBounds = function(places) {
        // Make sure places has data
        if (places.length == 0) {
            return;
        }
      
        var bounds = new google.maps.LatLngBounds();
        // Clear out previous googlePlacesMarkers
        cleargooglePlacesMarkers();
        // For each place, get the icon, place name, and location.
        for (var i = 0, place; place = places[i]; i++) {
          setMarker(place);
          bounds.extend(place.geometry.location);
        }
        console.log(self.googlePlacesMarkers());
        return bounds;
    }

    var getYelpData = function(GPS) {
      // use the oauth.js file to create a valid URL
      // resource: http://stackoverflow.com/questions/13149211/yelp-api-google-app-script-oauth

      // From GPS object 
      var terms = GPS.searchTerm.replace(/ /g, '+');
      var mapBounds = GPS.sw.A + "," + GPS.sw.F + "|" + GPS.ne.A + "," + GPS.ne.F;

      // For Yelp API
      var auth = { 
        consumerKey: "gDwI0o8u_hu4hWN2w6XsJg", 
        consumerSecret: "31NYb6D6gvYY73HW4PNSQ-3ZWiI",
        accessToken: "63gRFuhSa3qxDuuQMCzOtGqqXKv76j2A",
        accessTokenSecret: "LgicDJc9QcP07Cg6DKPQbkY79_c",
      };
      var accessor = {
        consumerSecret: auth.consumerSecret,
        tokenSecret: auth.accessTokenSecret
      };
      var parameters = [];
      parameters.push(['term', terms]);
      parameters.push(['bounds', mapBounds]);
      parameters.push(['callback', 'cb']);
      parameters.push(['oauth_consumer_key', auth.consumerKey]);
      parameters.push(['oauth_consumer_secret', auth.consumerSecret]);
      parameters.push(['oauth_token', auth.accessToken]);
      parameters.push(['oauth_signature_method', 'HMAC-SHA1']);
      var message = { 
        'action': 'http://api.yelp.com/v2/search',
        'method': 'GET',
        'parameters': parameters 
      };
      OAuth.setTimestampAndNonce(message);  
      OAuth.SignatureMethod.sign(message, accessor);
      var parameterMap = OAuth.getParameterMap(message.parameters);

      // Return url and get JSON back
      //var url = OAuth.addToURL(message.action,parameterMap);
      $.ajax({
        'url' : message.action,
        'data' : parameterMap,
        'dataType' : 'jsonp',
        'global' : true,
        'jsonpCallback' : 'cb',
        'success' : function(data){
          console.log(data);
        }
      }).error(function(){
        console.log("this was an error");
      });

      //console.log(url);
    }

    //Error handling if Google Maps fails to load
    this.mapRequestTimeout = setTimeout(function() {
        $('#map-canvas').html('Could not load map. Please try again!');
    }, 8000);

    // Initialize Google map, perform initial deal search on a city.
    function mapInitialize() {
        clearTimeout(self.mapRequestTimeout);
        // Set initial map
        google.maps.event.addDomListener(window, "resize", function() {
            var center = map.getCenter();
            google.maps.event.trigger(map, "resize");
            map.setCenter(center);
        });
        map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);
        // Listen for searches then set the new places for the new area/search
        google.maps.event.addListener(searchBox, 'places_changed', function() {
            var places = searchBox.getPlaces();
            bounds = setBounds(places);
            map.fitBounds(bounds);
            map.setZoom(12);
            var GPS = {
              ne: map.getBounds().getNorthEast(),
              sw: map.getBounds().getSouthWest(),
              searchTerm: searchBox.gm_accessors_.places.Sc.D
            };

            getYelpData(GPS);

        });

        // Bias the SearchBox results towards places that are within the bounds of the
        // current map's viewport.
        google.maps.event.addListener(map, 'bounds_changed', function() {
            var bounds = map.getBounds();
            searchBox.setBounds(bounds);
        });
    }
    mapInitialize();
}

ko.applyBindings(new appViewModel);