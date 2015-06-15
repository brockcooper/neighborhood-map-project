function appViewModel() {
  var self = this;
  var city, mapOptions, map, input, searchBox, sidebar;

  // Create array that will populate the sidebar and keep track of Google Places and Yelp
  this.googleMapMarkers = ko.observableArray();
  this.googlePlacesInfo = ko.observableArray();
  this.foursquareInfo = ko.observableArray();

  // set the Foursquare and googlePlace Icons... MapItemIcon will be set depending on if it is foursqure or places
  var foursquareIcon = "https://playfoursquare.s3.amazonaws.com/press/2014/foursquare-logomark.png";
  var googlePlaceIcon = "http://images.clipartpanda.com/google-location-icon-whitakergroup-google-location-icon-195x300.png";
  var mapItemIcon = "";

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
  sidebar = (document.getElementById('sidebar'));
  searchBox = new google.maps.places.SearchBox((input));

  // This will get the formatted address then set icon depending if Foursqaure or Places
  var getFormattedAddressAndSetIcon = function(place) {
    var address = '';
    var location = place.location;

    if (!place.formatted_address && location) {
      for (var i in place.location.formattedAddress) {
        address += place.location.formattedAddress[i] + ' ';
      }
      address = address.slice(0, -1);
      mapItemIcon = foursquareIcon;
    } else {
      address = place.formatted_address;
      mapItemIcon = googlePlaceIcon;
    }

    return address;
  };

  // If there is a URL in the object then return it else leave it blank
  var getURL = function(place) {
    var url = '';
    var anchor = '';
    if (place.url) {
      url = place.url;
    } else if (!place.formatted_address) {
      url = "https://foursquare.com/v/" + place.id;
    }
    if (url.length > 0) {
      anchor = '<a href="' + url + '" target=_blank> ' + place.name + '</a>';
    } else {
      anchor = place.name;
    }
    return anchor;
  };

  // Will return any checkin or ratings information if it is available
  var getMoreInfo = function(place) {
    var moreInfo = '';
    place.rating ? moreInfo += '<p> Rating: ' + place.rating + '</p>' : false;
    place.stats ? moreInfo += '<p> Checkins: ' + place.stats.checkinsCount + '</p>' : false;
    return moreInfo;
  };

  // This data goes in the InfoWindow and the side bar
  var createInfoWindowContent = function(place, position) {
    var address = getFormattedAddressAndSetIcon(place);
    var contentString = '<h1 class="infoHeader">' +
      '<button type="button" class="item-button" id="' + position + '">' +
      '<img class="item-icon" src="' + mapItemIcon + '" /></button>' + getURL(place) + '</h1>' +
      '<p>' + address + '</p>' + getMoreInfo(place);
    return contentString;
  };

  // Set Google Place Markers into Map
  var setMarker = function(place) {
    // Returns position based off if it is foursquare or not
    var getPosition = function() {
      var position;
      if (!place.geometry) {
        position = new google.maps.LatLng(place.location.lat, place.location.lng);
        self.foursquareInfo.push(place);
      } else {
        position = place.geometry.location;
        self.googlePlacesInfo.push(place);
      }
      return position;
    };

    // Which icon will it put down on the map?
    var image = {
      url: place.icon ? place.icon : foursquareIcon,
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
      position: getPosition()
    });

    self.googleMapMarkers.push(marker);

    // Get the position in the array to use this later to open infowindows from sidebar
    var markerPosition = self.googleMapMarkers().length - 1;
    var HTMLContent = createInfoWindowContent(place, markerPosition);

    // Generate InfoWindow
    var infoWindow = new google.maps.InfoWindow({
      content: HTMLContent,
      pixelOffset: new google.maps.Size(-25, 0)
    });

    google.maps.event.addListener(marker, 'click', function() {
      infoWindow.open(map, marker);
    });

    // Put Info to side bar 
    $('#sidebar').append(HTMLContent + '<hr>');
  };

  // Clears out map and info arrays
  var cleargooglePlacesMarkers = function() {
    for (var i = 0, marker; marker = self.googleMapMarkers()[i]; i++) {
      marker.setMap(null);
    }
    self.googleMapMarkers.removeAll();
    self.googlePlacesInfo.removeAll();
    self.foursquareInfo.removeAll();
    // Clear out Sidebar in new search and show it if it is not there
    $("#sidebar").empty();
    $("#sidebar").show();
  };

  // Set the bounds of the map after you search
  var setBounds = function(places) {
    // Make sure places has data
    if (places.length === 0) {
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
    return bounds;
  };

  // gets the JSON data from the Foursqaure API
  var getFoursquareData = function(GPS) {
    // set up variables for URL request using GPS object 
    var term = GPS.searchTerm.replace(/ /g, '+');
    var sw = GPS.sw.A + "," + GPS.sw.F;
    var ne = GPS.ne.A + "," + GPS.ne.F;
    var ll = GPS.center.A + "," + GPS.center.F;
    var client_id = "WGQH2NSLMADX2E4KOGNMN2LU3WQXTQIHSHA1ZUL0DIR3WCRK";
    var client_secret = "IQ4TFNK0IN324QTJLUIJHWWI2HHTC0ZPZKIT5ICWOAQEDA1V";
    var JSONdata;

    //creates URL
    var url = "https://api.foursquare.com/v2/venues/search?" +
      "client_id=" + client_id +
      "&client_secret=" + client_secret +
      "&v=20150601" + "&limit=20" +
      "&intent=" + "browse" +
      "&ll=" + ll +
      "&ne=" + ne + "&sw=" + sw +
      "&query=" + term;

    // AJAX call to API
    function getJSONData() {
      return $.ajax({
        url: url,
        dataType: 'json'
      });
    }

    // Once we get the JSON data then set markers on map and continue processing
    getJSONData().done(function(data) {
      data = data.response.venues;
      data.forEach(function(item) {
        setMarker(item);
        // Add this after all items set so you can open info window from sidebar
        $('.item-button').on("click", function() {
          var id = $(this).attr("id");
          google.maps.event.trigger(self.googleMapMarkers()[id], 'click');
        });
      });
    }).fail(function() {
      $('#sidebar').append("<p class='alert'>Could not get Foursquare data. Please try again!</p>");
      // Still set this even if the foursqaure data fails
      $('.item-button').on("click", function() {
        var id = $(this).attr("id");
        google.maps.event.trigger(self.googleMapMarkers()[id], 'click');
      });
    });
  };

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
    // Put sidebar and input bar onto the map
    map.controls[google.maps.ControlPosition.TOP_RIGHT].push(sidebar);
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);
    // Listen for searches then set the new places for the new area/search
    google.maps.event.addListener(searchBox, 'places_changed', function() {
      try {
        var places = searchBox.getPlaces();
        if (places == []) throw "Could not find results. Please try again!"
        bounds = setBounds(places);
        map.fitBounds(bounds);
        map.setZoom(12);
        var GPS = {
          ne: map.getBounds().getNorthEast(),
          sw: map.getBounds().getSouthWest(),
          center: map.getBounds().getCenter(),
          searchTerm: searchBox.gm_accessors_.places.Qc.D
        };
        getFoursquareData(GPS);
      } catch(err) {
        cleargooglePlacesMarkers();
        $('#sidebar').append("<p class='alert'>Could not find results. Please try again!</p>");
      } 
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

ko.applyBindings(new appViewModel());