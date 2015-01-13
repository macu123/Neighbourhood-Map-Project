var map;

function Venue(data){
  this.name = ko.observable(data.venue.name);
  this.contact = ko.observable(data.venue.contact.formattedPhone);
  this.location = ko.observable(data.venue.location.formattedAddress[0]);
  this.category = ko.observable(data.venue.categories[0].name);
  this.verified = ko.observable(data.venue.verified);
}

function AppViewModel(){
  var self = this;

  self.venues = ko.observableArray();

  //request popular venues from FOURSQAURE
  self.addVenues = function(){
    var four_square_baseUrl = "https://api.foursquare.com/v2/venues/explore?client_id=2XMLIEZFYZSTKFVOSAL5JQFQLQNDNMYGXWGGPWXUSDXQCK4L&client_secret=ZKSE15LDLRYU31YZA2WRL2UYQLDGWFBIPUPTLRH3ITWCEZFL&v=20141230&";
    var ll = map.getCenter().toUrlValue();
    var query = $("#pac-input").val();
    var urlToRequest = four_square_baseUrl + "ll=" + ll + "&query=" + query + "&limit=10";
    $.getJSON(urlToRequest, function(data){
      var venues = data.response.groups[0].items;
      for(var index in venues){
        var venue = new Venue(venues[index]);
        self.venues.push(venue);
      }
    })
  }

  self.removeVenues = function(){
    self.venues.removeAll();
  }

  self.updateVenues = function(){
    if(self.venues().length != 0){
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

  // Create the search box and link it to the UI element.
  var searchbox = /** @type {HTMLInputElement} */(
      document.getElementById('SearchBox'));
  var ListDisplay = document.getElementById('popular-places');

  map.controls[google.maps.ControlPosition.TOP_LEFT].push(searchbox);
  map.controls[google.maps.ControlPosition.TOP_RIGHT].push(ListDisplay);
  
}

google.maps.event.addDomListener(window, 'load', initialize);