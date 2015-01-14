var map;
var bounds;

function ChangeBounds(myLatLng) {
  bounds.extend(myLatLng);
  map.fitBounds(bounds);
}

function Venue(data) {
  this.name = ko.observable(data.venue.name);
  this.contact = ko.observable(data.venue.contact.formattedPhone);
  this.location = ko.observable(data.venue.location.formattedAddress[0]);
  this.category = ko.observable(data.venue.categories[0].name);
  this.verified = ko.observable(data.venue.verified);
}

function AppViewModel() {
  var self = this;

  self.venues = ko.observableArray();
  self.markers = [];

  //request popular venues from FOURSQAURE
  self.addVenues = function() {
    var four_square_baseUrl = "https://api.foursquare.com/v2/venues/explore?client_id=2XMLIEZFYZSTKFVOSAL5JQFQLQNDNMYGXWGGPWXUSDXQCK4L&client_secret=ZKSE15LDLRYU31YZA2WRL2UYQLDGWFBIPUPTLRH3ITWCEZFL&v=20141230&radius=15000&limit=10&";
    var ll = map.getCenter().toUrlValue();
    var query = $("#pac-input").val();
    var urlToRequest = four_square_baseUrl + "ll=" + ll + "&query=" + query;
    $.getJSON(urlToRequest, function(data){
      var venues = data.response.groups[0].items;
      for(var index in venues){
        var myLatlng = new google.maps.LatLng(
          venues[index].venue.location.lat,
          venues[index].venue.location.lng
          );
        ChangeBounds(myLatlng);
        var marker = new google.maps.Marker({
          position: myLatlng,
          map: map,
          animation: google.maps.Animation.DROP
        });
        var venue = new Venue(venues[index]);
        self.markers.push(marker);
        self.venues.push(venue);
      }
    })
  };

  self.removeVenues = function() {
    self.venues.removeAll();
  };

  self.removeMarkers = function() {
    while(self.markers.length > 0) {
      self.markers.pop().setMap(null);
    }
  };

  self.update = function() {
    if(self.venues().length != 0) {
      self.removeMarkers();
      self.removeVenues();
    }

    self.addVenues();
  }

}

function initialize() {
  var mapOptions = {
  	center: new google.maps.LatLng(43.2633, -79.9189),
  	zoom: 13,
  	disableDefaultUI: true
  }
  map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
  bounds= new google.maps.LatLngBounds();
  // Create the search box and link it to the UI element.
  var searchbox = /** @type {HTMLInputElement} */(
      document.getElementById('SearchBox'));
  var ListDisplay = document.getElementById('popular-places');

  map.controls[google.maps.ControlPosition.TOP_LEFT].push(searchbox);
  map.controls[google.maps.ControlPosition.TOP_RIGHT].push(ListDisplay);
  
}

google.maps.event.addDomListener(window, 'load', initialize);