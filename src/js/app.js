import jsyaml from 'js-yaml';

function doc_keyUp(e) {
    if ((e.ctrlKey && e.keyCode == 13) || (e.keyCode == 27)){
        e.preventDefault()
        var button = document.getElementById('draw')
        if (button) {
          button.click()
        } else {
          var design = window.opener.design;
          draw(design);
        }
        return false;
    } else if (e.ctrlKey && e.keyCode == 221) {
      e.preventDefault()
      var button = document.getElementById('fullScreen')
      button.click()
      return false;
    }

  }
// register the handler
document.addEventListener('keyup', doc_keyUp, false);

function copyToClipboard(text) {

  // Create a "hidden" input
  var aux = document.createElement("input");

  // Assign it the value of the specified element
  aux.setAttribute("value", text);

  // Append it to the body
  document.body.appendChild(aux);

  // Highlight its content
  aux.select();

  // Copy the highlighted text
  document.execCommand("copy");

  // Remove it from the body
  document.body.removeChild(aux);

}

/* -------- Moved from index.html -------- */

angular
    .module("dld4e", ['ui.bootstrap', 'ui.ace'])
    .controller("mainController", mainController)

mainController.$inject = ["$scope", "$http", "$sce", "$log", "$window", "$location", "$timeout", "$animate"];

function mainController($scope, $http, $sce, $log, $window, $location, $timeout, $animate) {

  var w = angular.element($window);
  w.bind('resize', function () {
    $scope.drawClick()
  });
  $scope.mode = " Hide editor"
  $scope.shown = true
  $scope.design = "";
  $scope.gistURL = "";
  $scope.dbURL = ""; // "https://syg5y0qnyf.execute-api.us-west-2.amazonaws.com/prod/"
  $scope.saveIcon = "glyphicon glyphicon-floppy-disk"
  $scope.linkText = " Link"
  $scope.docId = $window.location.hash.substring(2)
  if ($scope.docId)  {
    $scope.url = $scope.dbURL + $scope.docId
    $scope.state = "Update";
    var leftSide = angular.element( document.querySelector( '#leftSide' ) );
    var rightSide = angular.element( document.querySelector( '#rightSide' ) );
    $scope.shown = false
    $scope.mode = " Show editor"
    $animate.setClass(leftSide, 'ng-hide', 'ng-show').then(function() {
      $animate.setClass(rightSide, 'col-sm-12', 'col-sm-6').then(function() {
        $http.get($scope.url)
             .then(function(res){
                $scope.acedata = res.data;
                $scope.drawClick()
              });
      })
    })
  } else {
    $scope.url = 'examples/NTP.yaml'
    $scope.state = "Save";
    $http.get($scope.url)
         .then(function(res){
            $scope.acedata = res.data;
            $scope.drawClick()
          });
  }

  $scope.aceyamlOptions = {
    onLoad: function (_ace) {
      _ace.getSession().setMode("ace/mode/yaml");
      _ace.$blockScrolling = Infinity;
      _ace.commands.addCommand({
          name: 'saveFile',
          bindKey: {
          win: 'Ctrl-S',
          mac: 'Command-S',
          sender: 'editor|cli'
          },
          exec: function(env, args, request) {
            $scope.saveFile();
          }
          });
      _ace.setOption("tabSize", 2);
    }
  };
  $scope.opend3js = function(greeting) {
    $window.design = jsyaml.load($scope.acedata) || {};
    var w = $window.open("fullscreen.html");
  };
  $scope.drawIconFamily = function(iconFamily) {
    var wi = window.open('about:blank', '_blank');
    $http.get('js/iconFamilies.json')
     .then(function(res){
       var iconFamilies = res.data
       var bestFit = Math.ceil(Math.sqrt(size))
       var familyName = iconFamily.split('-')[0]
       var size = iconFamilies[familyName].length
       var url = "templates/" + iconFamily + ".yaml"
       $http.get(url)
            .then(function(res){
               var doc = jsyaml.load(res.data);
               var ratios = doc.diagram.aspectRatio.split(':')
               var h = ratios[0]
               var w = ratios[1]
               doc.diagram.rows = Math.ceil(Math.sqrt(size*w/h))
               doc.diagram.columns = Math.ceil(size/doc.diagram.rows)
               var x = 0
               var y = doc.diagram.rows - 1
               doc.icons = {}
               for (var icon in iconFamilies[familyName]){
                 doc.icons[iconFamilies[familyName][icon]] = Object.assign( { x: x, y: y, icon: iconFamilies[familyName][icon]}, doc.icon)
                 x += 1
                 if (x == doc.diagram.columns) {
                   x = 0
                   y -= 1
                 }
               }
               $window.design = doc;
               wi.location.href = 'fullscreen.html';
             });
    });
  }
  $scope.example = function(file) {
    $http.get("examples/" + file)
         .then(function(res){
            $scope.acedata = res.data;
            $window.location.hash = ""
            $scope.state = "Save"
            $scope.drawClick();
          });
  }

  $scope.drawClick = function() {
    $window.design = jsyaml.load($scope.acedata) || {};
    draw($window.design);
    $window.document.title = 'drawthe.net: ' + window.design.title.text
  }


  $scope.gist = function() {
    var parts = $scope.gistURL.split('/')
    var githubUser = parts[3]
    var githubGist = parts[4]
    $http.get('//gist.githubusercontent.com/' + githubUser + '/' + githubGist + '/raw')
      .then(function(res) {
        $scope.acedata = res.data;
        $scope.drawClick()
      })
    $scope.gistURL = ""
    $window.location.hash = ""
    $scope.state = "Save"
  }

  $scope.link = function() {
    copyToClipboard($location.absUrl())
    $scope.linkText = " Copied to clipboard"
    $timeout(function () {
      $scope.linkText = "Link"
    }, 200);
  }

  $scope.fork = function() {
    $scope.state = "Save"
    $scope.save()
  }

  $scope.fullScreen = function () {
    var leftSide = angular.element( document.querySelector( '#leftSide' ) );
    var rightSide = angular.element( document.querySelector( '#rightSide' ) );

    if ($scope.shown) {
      $scope.shown = false
      $scope.mode = " Show editor"
      $animate.setClass(leftSide, 'ng-hide', 'ng-show').then(function() {
        $animate.setClass(rightSide, 'col-sm-12', 'col-sm-6').then(function() {
          $scope.drawClick();
        })
      })
    } else {
      $scope.shown = true
      $scope.mode = " Hide editor"
      $animate.setClass(leftSide, 'ng-show', 'ng-hide').then(function() {
        $animate.setClass(rightSide, 'col-sm-6', 'col-sm-12').then(function() {
          $scope.drawClick();
        })
      })
    }
  }


  $scope.save = function() {
    if ($scope.state == "Save") {
      $scope.saveIcon = "glyphicon glyphicon-hourglass"
      var data = $scope.acedata;
      var config = {
                  headers : {
                      'Content-Type': 'text/x-yaml'
                  }
              }
      $http.post($scope.dbURL, data, config)
       .then(
           function(response){
             $scope.docId = response.data.docId
             $window.location.hash=response.data.docId
             $scope.saveIcon = "glyphicon glyphicon-ok-circle"
             $timeout(function () {
               $scope.saveIcon = "glyphicon glyphicon-floppy-disk";
               $scope.state = "Update";
             }, 200);
           },
           function(response){
             $scope.saveIcon = "glyphicon glyphicon-alert";
             console.log(response)
           }
        );
    } else if ($scope.state == "Update") {
       $scope.saveIcon = "glyphicon glyphicon-hourglass"
        var url = $scope.dbURL + $scope.docId;
        var data = $scope.acedata;
        var config = {
                  headers : {
                      'Content-Type': 'text/x-yaml'
                  }
              }
        $http.put(url, data, config)
         .then(
             function(response){
               $window.location.hash=response.data.docId
               $scope.saveIcon = "glyphicon glyphicon-ok-circle"
               $timeout(function () {
                 $scope.saveIcon = "glyphicon glyphicon-floppy-disk"
               }, 200);

             },
             function(response){
               $scope.saveIcon = "glyphicon glyphicon-alert";
               console.log(response)
             }
          );
    }
  }
  $scope.saveFile = function() {
    var data = $scope.acedata,
        blob = new Blob([data], { type: 'text/plain' }),
        url = $window.URL || $window.webkitURL;
        design = jsyaml.load(data) || {};
        fileName = `${design.title.text || 'dld4e'}-v${design.title.version || '1.01'}.yaml`
    url = url.createObjectURL(blob); //do
    var downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = fileName;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  }

  $scope.saveImage = function() {
    saveSvgAsPng(
        document.querySelector('svg'),
        design.title.text + '.png',
        {scale: 4, backgroundColor: 'white'}
    );
  }

};
