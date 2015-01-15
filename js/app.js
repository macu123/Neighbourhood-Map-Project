var map;
var bounds;
var markers = [];
var infowindow;
var venues;

function ChangeBounds(myLatLng) {
  bounds.extend(myLatLng);
  map.fitBounds(bounds);
}

function openInfoWindow(myVenue) {
  for(var index in markers) {
    if(markers[index].getTitle() === myVenue.id){
      break;
    }
  }
  updateInfoWindow(venues, markers[index]);
  infowindow.open(map, markers[index]);
}

function updateInfoWindow(venues, marker) {
  var id = marker.getTitle();
  for(var index in venues){
    if(venues[index].venue.id === id){
      break;
    }
  }

  var name = venues[index].venue.name;
  var contact = venues[index].venue.contact.formattedPhone;
  var address = venues[index].venue.location.formattedAddress[0];
  var category = venues[index].venue.categories[0].name;
  var verified = venues[index].venue.verified;
  var contentString = "<h2>" + name + "</h2>" + "<p>" + contact + "</p>" +
                  "<p>" + address + "</p>";
  infowindow.setContent(contentString);
}

function createInfoWindow(contentString) {
  return new google.maps.InfoWindow({content: contentString});
}

function createLatlng(myVenue) {
  return new google.maps.LatLng(
    myVenue.venue.location.lat,
    myVenue.venue.location.lng
    );
}

function createMarker(myLatlng, id) {
  return new google.maps.Marker({
    position: myLatlng,
    title: id,
    animation: google.maps.Animation.DROP
  });
}

function addMarker(myMarker) {
  myMarker.setMap(map);
  markers.push(myMarker);
}

function removeMarkers() {
  while(markers.length > 0) {
    markers.pop().setMap(null);
  }
}

function Venue(data) {
  this.id = data.venue.id;
  this.name = ko.observable(data.venue.name);
  this.contact = ko.observable(data.venue.contact.formattedPhone);
  this.address = ko.observable(data.venue.location.formattedAddress[0]);
  this.category = ko.observable(data.venue.categories[0].name);
  this.verified = ko.observable(data.venue.verified);
}

function AppViewModel() {
  var self = this;

  self.venues = ko.observableArray();

  //request popular venues from FOURSQAURE
  self.addVenues = function() {
    var four_square_baseUrl = "https://api.foursquare.com/v2/venues/explore?client_id=2XMLIEZFYZSTKFVOSAL5JQFQLQNDNMYGXWGGPWXUSDXQCK4L&client_secret=ZKSE15LDLRYU31YZA2WRL2UYQLDGWFBIPUPTLRH3ITWCEZFL&v=20141230&radius=15000&limit=10&";
    var ll = map.getCenter().toUrlValue();
    var query = $("#pac-input").val();
    var urlToRequest = four_square_baseUrl + "ll=" + ll + "&query=" + query;
    $.getJSON(urlToRequest, function(data){
      venues = data.response.groups[0].items;
      for(var index in venues){
        var myLatlng = createLatlng(venues[index]);
        ChangeBounds(myLatlng);
        var marker = createMarker(myLatlng, venues[index].venue.id);
        addMarker(marker);
        google.maps.event.addListener(marker, 'click', function() {
          updateInfoWindow(venues, this);
          infowindow.open(map, this);
        });
        var venue = new Venue(venues[index]);
        self.venues.push(venue);

      }
    })
  };

  self.removeVenues = function() {
    self.venues.removeAll();
  };

  self.update = function() {
    if(self.venues().length != 0) {
      removeMarkers();
      self.removeVenues();
    }

    self.addVenues();
  };

}

function initialize() {
  var mapOptions = {
  	center: new google.maps.LatLng(43.2633, -79.9189),
  	zoom: 13,
  	disableDefaultUI: true
  }
  map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
  bounds= new google.maps.LatLngBounds();
  infowindow = createInfoWindow("Default");
  // Create the search box and link it to the UI element.
  var searchbox = /** @type {HTMLInputElement} */(
      document.getElementById('SearchBox'));
  var ListDisplay = document.getElementById('popular-places');

  map.controls[google.maps.ControlPosition.TOP_LEFT].push(searchbox);
  map.controls[google.maps.ControlPosition.TOP_RIGHT].push(ListDisplay);
  
}

google.maps.event.addDomListener(window, 'load', initialize);