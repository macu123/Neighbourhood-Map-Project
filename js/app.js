var map;
var infowindow;

VenueModel = function(data) {
  this.name = this.checkData(data.venue.name);
  this.contact = this.checkData(data.venue.contact.formattedPhone);
  this.address = this.checkData(data.venue.location.formattedAddress[0]);
  this.category = this.checkData(data.venue.categories[0].name);
  this.verified = this.checkData(data.venue.verified);
  this.rating = this.checkData(data.venue.rating);
  this.icon_prefix = data.venue.categories[0].icon.prefix;
  this.icon_suffix = data.venue.categories[0].icon.suffix;

  this.marker = new google.maps.Marker({
    position: new google.maps.LatLng(
    data.venue.location.lat,
    data.venue.location.lng
    ),
    icon: this.icon_prefix + "bg_44" + this.icon_suffix,
    animation: google.maps.Animation.DROP
  });
};

VenueModel.prototype.addMarker = function() {
  this.marker.setMap(map);
};

VenueModel.prototype.removeMarker = function() {
  this.marker.setMap(null);
};

VenueModel.prototype.openInfoWindow = function() {
  infowindow.setContent(this.marker.contentHtml);
  infowindow.open(map, this.marker);
  map.setCenter(this.marker.getPosition());
  if(map.getZoom() < 13) {
    map.setZoom(13);
  }
};

VenueModel.prototype.extendBounds = function(bounds) {
  bounds.extend(this.marker.getPosition());
};

VenueModel.prototype.checkData = function(raw_data) {
  if(typeof(raw_data) === 'undefined' || raw_data === "") {
    return "N/A";
  }
  else {
    return raw_data;
  }
  
};

function VenuesModel() {
  var self = this;

  //ObservableArray to store all VenueModel
  self.venuesModel = ko.observableArray();
  //Observable for number of list unread
  self.num_unread = ko.observable(0);
  //Observable to store boolean variable for if the list is shown or not
  self.if_shown = ko.observable(false);

  //request popular venues from FOURSQAURE
  self.addvenuesModel = function() {
    var four_square_baseUrl = "https://api.foursquare.com/v2/venues/explore?client_id=2XMLIEZFYZSTKFVOSAL5JQFQLQNDNMYGXWGGPWXUSDXQCK4L&client_secret=ZKSE15LDLRYU31YZA2WRL2UYQLDGWFBIPUPTLRH3ITWCEZFL&v=20141230&radius=15000&limit=10&";
    var ll = map.getCenter().toUrlValue();
    var query = $("#pac_input").val();
    var urlToRequest = four_square_baseUrl + "ll=" + ll + "&query=" + query;
    $.getJSON(urlToRequest, function(data) {
      var venues = data.response.groups[0].items;
      var bounds = new google.maps.LatLngBounds();
      if(self.checkError(venues) === false)
        return;
      for(var index in venues) {
        var venueModel = new VenueModel(venues[index]);
        venueModel.extendBounds(bounds);
        venueModel.addMarker();
        ko.applyBindings(venueModel, $('#infoWindow')[0]);
        venueModel.marker.contentHtml = $('#infoWindow').html()
        ko.cleanNode($('#infoWindow')[0]);
        self.venuesModel.push(venueModel);
        
        google.maps.event.addListener(venueModel.marker, 'click', function() {
          infowindow.setContent(this.contentHtml);
          infowindow.open(map, this);
          map.setCenter(this.getPosition());
          if(map.getZoom() < 13) {
            map.setZoom(13);
          }
        });
      }
      self.num_unread(self.venuesModel().length);

      map.setCenter(bounds.getCenter());
      map.fitBounds(bounds);
    }).error(function() {
      self.if_shown(false);
    })
  };

  self.removevenuesModel = function() {
    while(self.venuesModel().length > 0) {
      self.venuesModel.pop().removeMarker();
    }
  };

  self.updatevenuesModel = function() {
    if(self.venuesModel().length > 0) {
      self.removevenuesModel();
    }

    self.addvenuesModel();
  };

  self.updatenum_unread = function() {
    self.num_unread(0);
  };

  self.checkError = function(data) {
    if(data.length < 1) {
      self.if_shown(false);
      return false;
    } else {
      self.if_shown(true);
      return true;
    }
  };

}

function initialize() {
  var mapOptions = {
  	zoom: 13,
    disableDefaultUI: true,
    scaleControl: true
  };
  map = new google.maps.Map($('#map-canvas')[0], mapOptions);

  // Try W3C Geolocation (Preferred)
  if(navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      var initialLocation = new google.maps.LatLng(
        position.coords.latitude,
        position.coords.longitude
        );
      map.setCenter(initialLocation);
    }, function() {
      map.setCenter(new google.maps.LatLng(43.2633, -79.9189));
    });
  }
  // Browser doesn't support Geolocation
  else {
    map.setCenter(new google.maps.LatLng(43.2633, -79.9189));
  }

  //Resize
  google.maps.event.addDomListener(window, "Resize", function() {
    var center = map.getCenter();
    google.maps.event.trigger(map, "resize");
    map.setCenter(center);
  });

  infowindow = new google.maps.InfoWindow({content: ""});
  
  ko.applyBindings(new VenuesModel(), $('#full-screen')[0]);

  $('#setting').popover({
    title: "Location Setting",
    content: "<input id='loc_input' type='text' placeholder='Location like Toronto'>",
    html: true,
    placement: "bottom"
  });

  $('#setting').on('shown.bs.popover', function() {
    var loc_input = $('#loc_input')[0];
    var autocompleteOption = {
      types: ['geocode']
    };
    var autocomplete = new google.maps.places.Autocomplete(
      loc_input,
      autocompleteOption
    );
    google.maps.event.addListener(autocomplete, 'place_changed', function() {
      var place = autocomplete.getPlace();
      //No geometry
      if(!place.geometry) {
        return;
      }
      //Have geometry
      //If have viewport
      if(place.geometry.viewport) {
        map.fitBounds(place.geometry.viewport);
      } else {
        map.setCenter(place.geometry.location);
        map.setZoom(13);
      }
      
    });
  });

}

google.maps.event.addDomListener(window, 'load', initialize);
