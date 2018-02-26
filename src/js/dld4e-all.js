import * as d3 from 'd3';
import showdown from 'showdown';

export function drawConnections(svg, diagram, connections, icons, notes) {
    var connectionLabelFontSize = Math.min(diagram.xBand.bandwidth()/8,diagram.yBand.bandwidth()/8)
    connections.forEach(function(connection,index) {
      var endpoints = connection.endpoints.map( function(device) { return device.split(':')[0]})

      var data = endpoints.map( function(thing) {
              if (thing in icons) {
              return { x: icons[thing].centerX,
                       y: icons[thing].centerY
                     }
              } else if (thing in notes) {
              return { x: notes[thing].centerX,
                       y: notes[thing].centerY
                     }
              }
      });
      var angleRadians = Math.atan2(data[1].y - data[0].y, data[1].x - data[0].x);
      var angleDegrees = angleRadians *180/Math.PI;

      // first, let get all the paths gong left to right & recompute
      if ((angleDegrees >= 90) || (angleDegrees < -90)) {
        connection.endpoints = connection.endpoints.reverse()
        endpoints = endpoints.reverse()
        data = data.reverse()
        angleRadians = Math.atan2(data[1].y - data[0].y, data[1].x - data[0].x);
        angleDegrees = angleRadians *180/Math.PI;
        if (connection.curve == 'curveStepAfter') {
          connection.curve = 'curveStepBefore'
        } else if (connection.curve == 'curveStepBefore') {
          connection.curve = 'curveStepAfter'
        }
      }
      var curve = d3[connection.curve] || d3.curveLinear
      var dxOffset = 3
      var firstLabel = connection.endpoints[0].split(':')[1]
      var secondLabel = connection.endpoints[1].split(':')[1]
      var pathName = "path" + index
      if (curve == d3.curveStepBefore) { startOffset = diagram.yBand.bandwidth()/2 }
      if (curve == d3.curveStepAfter) { startOffset = diagram.xBand.bandwidth()/2 }
      if (curve == d3.curveStep) { startOffset = diagram.xBand.bandwidth()/2 }
      if (curve == d3.curveLinear) {
          // find the angle of the center to the corner
          var c2cRadians = Math.atan2(diagram.yBand.bandwidth() - diagram.yBand.bandwidth()/2, diagram.xBand.bandwidth() - diagram.xBand.bandwidth()/2);
          var c2cDegrees = c2cRadians *180/Math.PI
          var A = Math.abs(c2cDegrees - Math.abs(angleDegrees))
          var C = 90 - c2cDegrees
          if (Math.abs(angleDegrees) > C ) { C = 90 - C }
          var B = 180 - (A + C)
          var b = Math.sqrt(Math.pow(diagram.xBand.bandwidth()/2,2) + Math.pow(diagram.yBand.bandwidth()/2,2))
          var c = (Math.sin(C*(Math.PI / 180))*b)/Math.sin(B*(Math.PI / 180))
          var startOffset = Math.abs(c)
          // add a little padding if we're leaning in
          if ((angleDegrees < 0) && (angleDegrees > -c2cDegrees)) {dxOffset = connectionLabelFontSize * .6}
          if ((angleDegrees > c2cDegrees) && (angleDegrees < 90)) {dxOffset = connectionLabelFontSize * .6}
        }
        // draw the path between the points
        svg.append("path")
          .datum(data)
          .attr("id", pathName)
          .style("stroke", connection.stroke || 'orange' )
          .style("fill", "none")
          .style("stroke-dasharray", connection.strokeDashArray || [0,0])
          .style("stroke-width", connection.strokeWidth || 1 )
          .attr("d", d3.line()
                       .curve(curve)
                       .x(function(d) { return d.x; })
                       .y(function(d) { return d.y; })
                   );

        // draw the text for the first label
        svg.append("text")
          .attr('class', 'connectionLabel')
          .style("fill", function(d) { return connection.color || "orange" })
          .style('font-size', connectionLabelFontSize + 'px' )
          .attr('dy', -1)
          .attr('dx', function(d) {
            return startOffset + dxOffset
          })
          .append("textPath")
            .style("text-anchor","start")
            .attr("xlink:href", "#" + pathName)
            .text(firstLabel);

        //in theses we enter the 2nd node in a different direction
        if (curve == d3.curveStepBefore) {
          startOffset = diagram.xBand.bandwidth()/2
        } else if (curve == d3.curveStepAfter) {
          startOffset = diagram.yBand.bandwidth()/2
        }
        // draw the text for the second node
        svg.append("text")
          .attr('class', 'connectionLabel')
          .style("fill", function(d) { return connection.color || "orange" })
          .style('font-size',  connectionLabelFontSize + 'px' )
          .attr('dy', connectionLabelFontSize)
          .attr('dx', function(d) {
            return -startOffset - this.getComputedTextLength() - dxOffset
          })
          .append("textPath")
            .style("text-anchor","end")
            .attr("startOffset","100%")
            .attr("xlink:href", "#" + pathName)
            .text(secondLabel);
    });
};
export function draw(doc) {
  // set the drawing defaults
  var drawingDefaults = {
    fill: "orange",
    aspectRatio: "1:1",
    rows: 10,
    columns: 10,
    groupPadding: .33,
    gridLines: true,
    gridPaddingInner: .4, // the space between icons (%)
    iconTextRatio: .33,
    margins: {top: 20, right: 20, bottom: 50, left: 20 }
  }
  // set the title defaults
  var titleDefaults = {
    text: "Decent looking diagrams for engineers",
    subText: "More information can be found at http://github.com/cidrblock/dld4e",
    author: "Bradley A. Thornton",
    company: "Self",
    date: new Date().toLocaleDateString(),
    version: 1.01,
    color: "orange",
    stroke: "orange",
    fill: "orange",
    heightPercentage: 6, // percent of total height
    logoUrl: "images/radial.png",
    logoFill: "orange"
  }
  // incase there are none
  var connections = doc.connections || [];
  var groups = doc.groups || [];
  var notes = doc.notes || [];
  var icons = doc.icons || [];

  // merge the doc properties into the defaults
  var diagram = Object.assign(drawingDefaults, doc.diagram || {});
  var title = Object.assign(titleDefaults, doc.title || {});

  // set the background color of the whole page
  document.body.style.background = diagram.fill;

  // find a good fit for the diagram
  var parentBox = d3.select("#svg").node().getBoundingClientRect();
  var ratios = diagram.aspectRatio.split(':');

  // set the desired h/w
  var availbleHeight = parentBox.height - diagram.margins.top - diagram.margins.bottom;
  var availbleWidth = parentBox.width - diagram.margins.left - diagram.margins.right;
  var svgWidth;
  var svgHeight;

  if (availbleHeight < availbleWidth) {
    svgHeight = availbleHeight;
    svgWidth = svgHeight/ratios[1] * ratios[0];
  } else if (availbleWidth < availbleHeight) {
    svgWidth = availbleWidth;
    svgHeight = svgWidth/ratios[0] * ratios[1];
  } else {
    svgWidth = availbleWidth;
    svgHeight = availbleHeight;
  }
  // downsize if outside the bounds
  if (svgHeight > availbleHeight) {
    svgHeight = availbleHeight;
    svgWidth = svgHeight/ratios[1] * ratios[0];
  }
  if (svgWidth > availbleWidth) {
    svgWidth = availbleWidth
    svgHeight = svgWidth/ratios[0] * ratios[1]
  }

  // using the svg dimentions, set the title and digrams
  title.height = svgHeight * title.heightPercentage/100
  diagram.height = svgHeight - title.height
  diagram.width = diagram.height/ratios[1] * ratios[0]
  diagram.x = (svgWidth - diagram.width)/2
  diagram.y = (svgHeight - title.height - diagram.height)

  // create our bands
  diagram.xBand = d3.scaleBand()
    .domain(Array.from(Array(diagram.columns).keys()))
    .rangeRound([diagram.x,diagram.width + diagram.x])
    .paddingInner(diagram.gridPaddingInner);

  diagram.yBand = d3.scaleBand()
    .domain(Array.from(Array(diagram.rows).keys()).reverse())
    .rangeRound([diagram.y,diagram.height + diagram.y])
    .paddingInner(diagram.gridPaddingInner);

  // remove the old diagram
  d3.select("svg").remove();

  // and add the svg
  var svg = d3.select("#svg").append("svg")
    .attr("width", parentBox.width )
    .attr("height", parentBox.height )
    .style("background-color", diagram.fill )
    .call(d3.zoom().on("zoom", function () {
        svg.attr("transform", d3.event.transform)
    }))
    .append("g")
      .attr("transform", "translate(" + (parentBox.width - svgWidth)/2 + "," + (parentBox.height - svgHeight)/2 + ")");

  // set x1,y1,x2,y2,width,height,centerX and centerY for all the stuff
  notes = processEntities(svg, diagram, notes)
  icons = processEntities(svg, diagram, icons)
  connections = processConnections(connections, groups, icons)
  groups = processGroups(groups, diagram, icons)

  // draw all the things
  drawTitle(svg, diagram, title)
  drawGridLines(svg, diagram)
  drawGroups(svg, diagram, groups, icons)
  drawConnections(svg, diagram, connections, icons, notes)
  drawIcons(svg, diagram, icons, diagram.iconTextRatio)
  drawNotes(svg, diagram, notes)
  PR.prettyPrint()

  // move all the labels to the front
  svg.selectAll('.connectionLabel')
    .each( function(d) { d3.select(this).moveToFront(); } )
  svg.selectAll('.groupLabel')
    .each( function(d) { d3.select(this).moveToFront(); } )
  svg.selectAll('.iconLabel')
    .each( function(d) { d3.select(this).moveToFront(); } )
}
export function drawGridLines(svg, drawing) {
  if (drawing.gridLines) {
    function make_x_gridlines() {
      return d3.axisBottom(drawing.xBand)
    }
    function make_y_gridlines() {
      return d3.axisLeft(drawing.yBand)
    }
    // X gridlines
    svg.append("g")
      .attr("class", "grid")
      .attr("transform", "translate(0," + drawing.height + drawing.y + ")")
      .call(make_x_gridlines()
        .tickSize(-drawing.height)
        .tickFormat("")
        .ticks(drawing.columns)
      )
    // Y gridlines
    svg.append("g")
    .attr("class", "grid")
    .attr("transform", "translate(" + drawing.x + "," + drawing.y + ")")
    .call(make_y_gridlines()
      .tickSize(-drawing.width)
      .tickFormat("")
      .ticks(drawing.rows)
    )
    // add the X Axis
    svg.append("g")
      .attr("transform", "translate(0," + drawing.height + drawing.y + ")")
      .attr("class", "axisNone")
      .call(d3.axisBottom(drawing.xBand));
    // add the Y Axis
    svg.append("g")
      .attr("transform", "translate(" + drawing.x + ",0)")
      .attr("class", "axisNone")
      .call(d3.axisLeft(drawing.yBand));
  }
};
export function drawGroups(svg, diagram, groups, icons) {
    for (var group in groups) {
      svg.append("rect")
         .attr("x", groups[group].x1)
         .attr("y", groups[group].y1)
         .attr("rx", diagram.xBand.bandwidth() * .05)
         .attr("ry", diagram.yBand.bandwidth() * .05)
         .attr("width", groups[group].width )
         .attr("height", groups[group].height )
         .attr("fill", function(d) { return groups[group].fill || 'orange' })
         .style("stroke", function(d) { return groups[group].stroke || 'orange' })
         .style("stroke-dasharray", groups[group].strokeDashArray || [0,0])
         .style("stroke-width", groups[group].strokeWidth || 1 )


      if (groups[group].name) {
        var textLocation = textPositions(groups[group].x1,groups[group].y1,groups[group].x2,groups[group].y2, groups[group].fontSize + 2 )[groups[group].textLocation || 'topLeft']
        svg.append("text")
          .attr('class', 'groupLabel')
          .text( groups[group].name )
          .attr("transform", "translate(" + textLocation.x + "," + textLocation.y + ")rotate(" + textLocation.rotate + ")")
          .attr("text-anchor", textLocation.textAnchor)
          .attr("dominant-baseline", "central")
          .style("font-size", groups[group].fontSize + "px")
          .attr('fill', function(d) { return groups[group].color || "orange"} )
      }
    }
};
export function drawIcons(svg, diagram, icons, iconTextRatio) {
  var deviceCellsAll = svg.selectAll("cells")
    .data(d3.entries(icons))
    .enter()

  var cells = deviceCellsAll.append("g")
    .attr("id", function(d) { return d.key })
    .attr("transform", function(d) { return "translate(" + diagram.xBand(d.value.x) + "," + diagram.yBand(d.value.y) + ")" })
    .on("mouseenter", handleMouseOver)
    .on("mouseleave", handleMouseOut)
    .each( function (d) {
      if (d.value.metadata) {
        var text = d3.select(this)
        text.style("cursor", "pointer")
      }
    })

  var cellFill = cells
    .append("rect")
    .attr("rx", function(d) { return d.value.rx })
    .attr("ry", function(d) { return d.value.ry })
    .attr("width", function(d) { return d.value.width })
    .attr("height", function(d) { return d.value.height })
    .attr("fill", function(d) { return d.value.fill || "orange"})
    .style("stroke", function(d) { return d.value.stroke || "orange" })
    .style("stroke-dasharray", function(d) { return d.value.strokeDashArray || [0,0] })


  var cellText = cells
    .append("text")
    .attr('class', 'iconLabel')
    .text( function (d) { return d.value.text || d.key })
    .each( function(d) {
      d.value.fontSize = Math.floor(Math.min(d.value.width*.9 / this.getComputedTextLength() * 12, d.value.height/2*iconTextRatio))
      d.value.textPosition = textPositions(0,0,d.value.width,d.value.height,d.value.fontSize + 2)[d.value.textLocation]
      if (d.value.url) {
        var text = d3.select(this)
        text.on("click", function() { window.open(d.value.url); })
        text.style("cursor", "pointer")
        text.style("text-decoration", "underline")
      }
    })
    .style("font-size", function(d) { return d.value.fontSize + "px"; })
    .attr("id", function(d) { return d.key + '-text'})
    .attr("transform", function(d) { return "translate(" + d.value.textPosition.x + "," + d.value.textPosition.y + ")rotate(" + d.value.textPosition.rotate + ")" })
    .attr('fill', function(d) { return d.value.color || "orange"} )
    .attr("text-anchor", function(d) { return d.value.textPosition.textAnchor})
    .attr("dominant-baseline", "central")

  var icon = cells
    .each ( function(d) {
      var cell = document.getElementById(d.key)
      var cellText = document.getElementById(d.key + "-text")
      var fontSize =  Math.ceil(parseFloat(cellText.style.fontSize))
      // center
      var x = (d.value.width*d.value.iconPaddingX)
      var y = (d.value.height*d.value.iconPaddingY)
      var width = d.value.width*(1-2*d.value.iconPaddingX)
      var height = (d.value.height)*(1-2*d.value.iconPaddingY)
      switch (true) {
        case d.value.textLocation.startsWith('top'):
          y += fontSize
          height = (d.value.height - fontSize)*(1-2*d.value.iconPaddingY)
          break;
        case d.value.textLocation.startsWith('left'):
          x += fontSize
          width = (d.value.width - fontSize)*(1-2*d.value.iconPaddingX)
          break;
        case d.value.textLocation.startsWith('right'):
          width = (d.value.width - fontSize)*(1-2*d.value.iconPaddingX)
          break;
        case d.value.textLocation.startsWith('bottom'):
          height = (d.value.height - fontSize)*(1-2*d.value.iconPaddingY)
          break;
      }

      var url = "images/" + d.value.iconFamily + "/" + d.value.icon + ".svg"
      d3.xml(url).mimeType("image/svg+xml").get(function(error, xml) {
        var svg = xml.getElementsByTagName("svg")[0]
        svg.setAttribute("x", x)
        svg.setAttribute("y", y)
        svg.setAttribute("width", width)
        svg.setAttribute("height", height)
        var paths = xml.getElementsByTagName("path")
        for (var i = 0; i < paths.length; i++) {
          if ((d.value.preserveWhite) && (paths[i].getAttribute("fill") == '#fff')) {
            //paths[i].setAttribute("fill", d.value.replaceWhite)
          } else if ((d.value.iconFill) && (paths[i].getAttribute("fill") != 'none')) {
            paths[i].setAttribute("fill", d.value.iconFill)
          }
          if ((d.value.iconStroke) && (paths[i].getAttribute("stroke") != 'none')) {
            paths[i].setAttribute("stroke", d.value.iconStroke)
          }
          if ((d.value.iconStrokeWidth) && (paths[i].getAttribute("stroke-width"))) {
            paths[i].setAttribute("stroke-width", d.value.iconStrokeWidth)
          }
        }
        cell.insertBefore(xml.documentElement.cloneNode(true), cellText);
      })
    })

    function handleMouseOver(d, i) {
      if ((d.value.metadata) && (d.value.metadata.url)) {
        var url = d.value.metadata.url
        var replacements = url.match(/{{\s*[\w\.]+\s*}}/g)
        if (replacements) {
          replacements.forEach(function(replacement){
            var inner = replacement.match(/[\w\.]+/)[0]
            if (inner == 'key') {
              url = url.replace(replacement, d.key)
            } else {
              url = url.replace(replacement, d.value[inner])
            }
          })
        }
        d3.json(url, function (error, json) {
          if (error) {
            var metadata = Object.assign({}, d.value.metadata);
            delete metadata.url
            if (d.value.metadata.errorText) {
              metadata.note = d.value.metadata.errorText
              delete metadata.errorText
            } else {
              metadata.status = "HTTP:" + error.target.status
              metadata.statusText = error.target.statusText
            }
            mouseOver(d,i,metadata)
            return
          } else {
            var metadata = Object.assign({},json, d.value.metadata);
            delete metadata.url
            delete metadata.errorText
            mouseOver(d,i,metadata)
            return
          }
        });
      } else if (d.value.metadata) {
        mouseOver(d,i,d.value.metadata)
      }
    }

    function mouseOver(d,i,json) {
      var metadata = json
      if (metadata) {
        var length = Object.keys(metadata).length
        var jc = "flex-start"
        var meta = svg
          .append("foreignObject")
          .attr("id", "t" + d.value.x + "-" + d.value.y + "-" + i)
          .attr("class", "mouseOver")
          .attr("x", function() {
            if ((d.value.x2 + d.value.width * 2) < diagram.width) {
              return d.value.x2
            } else {
              jc = "flex-end"
              return d.value.x1 - (d.value.width * 3)
            }
            return d.value.x2; })
          .attr("y", function() { return d.value.centerY - (length * d.value.fontSize) })
          .append("xhtml:div")
          .attr("class", "metadata")
          .style("width", function() { return d.value.width * 3 + "px" })
          .style("height", function() { return length * d.value.fontSize })
          .style("justify-content", jc)
          .style("font-size", function() { return d.value.fontSize + "px"; })
          .html(function() {
            var text = "<table>"
            for (var key in metadata) {
              text += ("<tr><td>" + key + ":&nbsp</td><td>" + metadata[key] + "</td></tr>")
            }
            text += "</table>"
            return text;
          })
      }
    }
    function handleMouseOut(d, i) {
      svg.selectAll(".mouseOver")
        .remove()
    }
};
export function drawNotes(svg, diagram, notes) {

  var converter = new showdown.Converter({extensions: ['prettify']});
  converter.setOption('prefixHeaderId', 'notes-');
  converter.setOption('tables', 'true');


  var xAlign = {
    left: {
      textAlign: "left",
      alignItems: "flex-start"
    },
    right: {
      textAlign: "right",
      alignItems: "flex-end"
    },
    center: {
      textAlign: "center",
      alignItems: "center"
    }
  }
  var yAlign = {
    top: {
      justifyContent: "flex-start"
    },
    center: {
      justifyContent: "center"
    },
    bottom: {
      justifyContent: "flex-end"
    }
  }

  var notes = svg.selectAll("notes")
    .data(d3.entries(notes))
    .enter()

  var notesg = notes.append("g")
    .attr("transform", function(d) { return "translate(" + d.value.x1 + "," + d.value.y1 + ")" })

  var noteFill = notesg
    .append("rect")
    .attr("rx", function(d) { return d.value.rx })
    .attr("ry", function(d) { return d.value.ry })
    .attr("width", function(d) { return d.value.width })
    .attr("height", function(d) { return d.value.height })
    .attr("id", function(d) { return d.key })
    .attr("fill", function(d) { return d.value.fill || "red" })
    .style("stroke", function(d) { return d.value.stroke || "red" })

  var noteTextDiv = notesg
    .append("foreignObject")
    .attr("width", function(d) { return d.value.width + "px" })
    .attr("height", function(d) { return d.value.height + "px" })
    .append("xhtml:div")
    .style("width", function(d) { return d.value.width + "px" })
    .style("height", function(d) { return d.value.height + "px" })
    .style('font-size', Math.min(diagram.yBand.bandwidth() * .125, diagram.xBand.bandwidth() * .125)  + 'px')
    .style('display', 'flex')
    .style('padding', function(d) { return d.value.padding + "px"})
    .attr("class", "notes")
    .style("color", function(d) { return d.value.color || "white" })
    .style('flex-direction', function(d) { return d.value.flexDirection || "column" } )
    .style('align-items', function(d) { return d.value.alignItems || xAlign[d.value.xAlign].alignItems })
    .style('justify-content', function(d) { return d.value.justifyContent || yAlign[d.value.yAlign].justifyContent })
    .style('text-align', function(d) { return d.value.textAlign || xAlign[d.value.xAlign].textAlign })
    .html( function (d) { return converter.makeHtml(d.value.text || "Missing text in note") })
};
export function processEntities(svg, diagram, icons) {

  // set some defaults, even though these won't be used for iconss we'll set them anyway
  var defaults = {
    xAlign: "left",
    yAlign: "top",
    textLocation: "bottomMiddle"
  }

  var previous = {}
  for(var key in icons) {
    icons[key] = Object.assign({}, defaults, icons[key])
    icons[key].w = icons[key].w || 1
    icons[key].h = icons[key].h || 1
    if (!("x" in icons[key])) {
      icons[key].x = previous.x
    } else if (icons[key].x.toString().startsWith('+')) {
      icons[key].x = parseInt(previous.x) + parseInt(icons[key].x.toString().split('+')[1])
    } else if (icons[key].x.toString().startsWith('-')) {
      icons[key].x = parseInt(previous.x) - parseInt(icons[key].x.toString().split('-')[1])
    }
    icons[key].x1 = diagram.xBand(icons[key].x)
    if (!("y" in icons[key])) {
      icons[key].y = previous.y
    } else if (icons[key].y.toString().startsWith('+')) {
      icons[key].y = parseInt(previous.y) + parseInt(icons[key].y.toString().split('+')[1])
    } else if (icons[key].y.toString().startsWith('-')) {
      icons[key].y = parseInt(previous.y) - parseInt(icons[key].y.toString().split('-')[1])
    }
    icons[key].y1 = diagram.yBand(icons[key].y)
    icons[key].width = diagram.xBand.bandwidth() + ((icons[key].w - 1) * diagram.xBand.step())
    icons[key].height = diagram.yBand.bandwidth() + ((icons[key].h - 1) * diagram.yBand.step())
    icons[key].x2 = icons[key].x1 + icons[key].width
    icons[key].y2 = icons[key].y1 + icons[key].height
    icons[key].centerX = icons[key].x1 + icons[key].width/2
    icons[key].centerY = icons[key].y1 + icons[key].height/2
    icons[key].rx = diagram.xBand.bandwidth() * .05
    icons[key].ry = diagram.yBand.bandwidth() * .05
    icons[key].padding = Math.min(diagram.yBand.bandwidth() * .05, diagram.xBand.bandwidth() * .05)
    icons[key].iconPaddingX = parseFloat("5%")/100
    icons[key].iconPaddingY = parseFloat("5%")/100
    previous = icons[key]
  }
  return icons
}

function clone(hash) {
  var json = JSON.stringify(hash);
  var obj = JSON.parse(json);
  return obj;
}

function diveOne(entry, icons, groups, depth) {
  var answer = []
  var result
  var depth
  if (entry in groups) {
    for (var i = 0; i < groups[entry].members.length; i++) {
      if (groups[entry].members[i] in groups) {
        result = diveOne(groups[entry].members[i], icons, groups, depth)
        answer = answer.concat(result.members)
        depth = result.depth
      } else {
        answer.push(groups[entry].members[i])
        if (i == 0 ) { depth += 1 }
      }
    }
  } else {
    answer.push(entry)
  }
  result = {members: answer, depth: depth}
  return result
}
function dive(connection, icons, groups) {
  var additionalConnections = []
  var endpoints = connection.endpoints.map( function(device) { return device.split(':')[0]})
  var labels = connection.endpoints.map( function(device) { return device.split(':')[1]})
  var starters;
  var enders;
  if (endpoints[0] in groups) {
    starters = diveOne( endpoints[0], icons, groups ).members
  } else {
    starters = [endpoints[0]]
  }
  if (endpoints[1] in groups) {
    enders = diveOne( endpoints[1], icons, groups ).members
  } else {
    enders = [endpoints[1]]
  }
  starters.forEach(function(starter) {
    enders.forEach(function(ender) {
      var c1 = starter + ":" + (labels[0] || '')
      var c2 = ender + ":" + (labels[1] || '')
      connection.endpoints = [c1,c2]
      additionalConnections.push(clone(connection))
    })
  })
  return additionalConnections
}
var processConnections = function(connections, groups, icons) {
  var additionalConnections = []
  var endpoints
  var labels
  for (var i = connections.length - 1; i >= 0; i--) {
    endpoints = connections[i].endpoints.map( function(device) { return device.split(':')[0]})
    labels = connections[i].endpoints.map( function(device) { return device.split(':')[1]})
    if ((endpoints[0] in groups) || (endpoints[1] in groups)) {
      additionalConnections = additionalConnections.concat(dive(connections[i],icons,groups))
      connections.splice(i, 1);
    } //if
  }
  return connections.concat(additionalConnections)
}

var processGroups = function(groups, diagram, icons) {
  for (var key in groups) {
    groups[key].maxDepth = 1
    var additionalMembers = [];
    var result;

    for (var i = groups[key].members.length - 1; i >= 0; i--) {
      if (!(groups[key].members[i] in icons)) {
        result = diveOne(groups[key].members[i], icons, groups, 1)
        additionalMembers = additionalMembers.concat(result.members)
        if (result.depth > groups[key].maxDepth) {
          groups[key].maxDepth = result.depth
        }
        groups[key].members.splice(i, 1);
      }
      groups[key].members = groups[key].members.concat(additionalMembers)
    }
    var xpad = (diagram.xBand.step() - diagram.xBand.bandwidth()) * diagram.groupPadding * groups[key].maxDepth
    var ypad = (diagram.yBand.step() - diagram.yBand.bandwidth()) * diagram.groupPadding * groups[key].maxDepth
    groups[key].x1 = diagram.xBand(d3.min(groups[key].members, function(d) {return icons[d].x })) - xpad
    groups[key].y1 = diagram.yBand(d3.max(groups[key].members, function(d) { return icons[d].y })) - ypad
    groups[key].x2 = d3.max(groups[key].members, function(d) { return icons[d].x2 + xpad })
    groups[key].y2 = d3.max(groups[key].members, function(d) { return icons[d].y2 + ypad })
    groups[key].width = groups[key].x2 - groups[key].x1
    groups[key].height = groups[key].y2 - groups[key].y1
    groups[key].fontSize = Math.min(xpad/groups[key].maxDepth,ypad/groups[key].maxDepth) - 2
  }
  return groups
}


function textPositions(x1, y1, x2, y2, fontSize) {
  var positions = {
    topLeft: { x: x1 + (fontSize/4), y: y1 + (fontSize/2), textAnchor: "start", rotate: 0 },
    topMiddle: { x: (x2 - x1)/2 + x1 , y: y1 + (fontSize/2), textAnchor: "middle", rotate: 0 },
    topRight: { x: x2 - (fontSize/4), y: y1 + (fontSize/2), textAnchor: "end", rotate: 0 },

    leftTop: { x: x1 + (fontSize/2), y: y1 + (fontSize/4), textAnchor: "end", rotate: -90 },
    leftMiddle: { x: x1 + (fontSize/2), y: y1 + (y2 - y1)/2, textAnchor: "middle", rotate: -90 },
    leftBottom: { x: x1 + (fontSize/2), y: y2 - (fontSize/4), textAnchor: "start", rotate: -90 },

    rightTop: { x: x2 - (fontSize/2), y: y1 + (fontSize/4), textAnchor: "start", rotate: 90 },
    rightMiddle: { x: x2 - (fontSize/2), y: y1 + (y2 - y1)/2, textAnchor: "middle", rotate: 90 },
    rightBottom: { x: x2 - (fontSize/2), y: y2 - (fontSize/4), textAnchor: "end", rotate: 90 },

    bottomLeft: { x: x1 + (fontSize/4), y: y2 - (fontSize/2), textAnchor: "start", rotate: 0 },
    bottomMiddle: { x: (x2 - x1)/2 + x1 , y: y2 - (fontSize/2), textAnchor: "middle", rotate: 0 },
    bottomRight: { x: x2 - (fontSize/4), y: y2 - (fontSize/2), textAnchor: "end", rotate: 0 },

    center: { x: (x2 - x1)/2 + x1 , y: y1 + (y2 - y1)/2 , textAnchor: "middle", rotate: 0 },
  }
  return positions
}




// https://github.com/wbkd/d3-extended
d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};
d3.selection.prototype.moveToBack = function() {
    return this.each(function() {
        var firstChild = this.parentNode.firstChild;
        if (firstChild) {
            this.parentNode.insertBefore(this, firstChild);
        }
    });
};
export function drawTitle(svg, drawing, title) {
  if (title.heightPercentage > 0) {
    // title bar
    var axisPadding = 20
    title.x1 = drawing.x - axisPadding
    title.y1 = drawing.height + drawing.y + axisPadding
    title.x2 = drawing.x + drawing.width + axisPadding
    title.y2 = title.y1 + title.height + axisPadding
    title.width = title.x2 - title.x1

    var titleBox = svg.append("g")
      .attr("transform", "translate(" + title.x1 + "," + title.y1 + ")")

    if (title.type == "bar") {
      titleBox.append("line")
        .attr("stroke", title.stroke )
        .attr("x2", title.width)
        .attr("fill", title.fill)
    } else {
      titleBox.append("rect")
        .attr("fill", title.fill)
        .attr("stroke", title.stroke )
        .attr('width', title.width)
        .attr('height', title.height)
    }

    // image and imagefill
    var padding = title.height * .025
    var titleInner = titleBox.append("g")
      .attr("transform", "translate(" + padding + "," + padding + ")")

    var logo = titleInner.append("g")
    logo.append("rect")
      .attr('width', title.height - 2*padding)
      .attr('height', title.height - 2*padding)
      .attr("fill", title.logoFill)
    logo.append("svg:image")
      .attr('width', title.height - 2*padding)
      .attr('height', title.height - 2*padding)
      .attr("xlink:href", title.logoUrl)

    // the text
    titleInner.append("text")
      .attr("x", title.height)
      .attr("y", title.height * 2/5)
      .attr("dominant-baseline", "middle")
      .style("fill", title.color)
      .style('font-size', title.height * .5 + 'px')
      .text(title.text)

    // the subtext
    titleInner.append("text")
      .attr("x", title.height)
      .attr("y", title.height * 4/5)
      .attr("dominant-baseline", "middle")
      .style("fill", title.color)
      .style('font-size', title.height * .25 + 'px')
      .text(title.subText)

    // credits and detail
    // Author
    titleInner.append("text")
      .attr("x", title.width - title.width/5)
      .attr("y", title.height * 1/8)
      .attr("dominant-baseline", "middle")
      .attr("text-anchor", "end")  // set anchor y justification
      .style("fill", title.color)
      .style('font-size', title.height * .25 + 'px')
      .style("font-weight", "bold")
      .text("Author:")

    titleInner.append("text")
      .attr("x", title.width - title.width/5 + 2*padding)
      .attr("y", title.height * 1/8)
      .attr("dominant-baseline", "middle")
      .style("fill", title.color)
      .style('font-size', title.height * .25 + 'px')
      .text(title.author)

      // Company
    titleInner.append("text")
      .attr("x", title.width - title.width/5)
      .attr("y", title.height * 3/8)
      .attr("dominant-baseline", "middle")
      .attr("text-anchor", "end")  // set anchor y justification
      .style("fill", title.color)
      .style('font-size', title.height * .25 + 'px')
      .style("font-weight", "bold")
      .text("Company:")

    titleInner.append("text")
      .attr("x", title.width - title.width/5 + 2*padding)
      .attr("y", title.height * 3/8)
      .attr("dominant-baseline", "middle")
      .style("fill", title.color)
      .style('font-size', title.height * .25 + 'px')
      .text(title.company)

    // Date
    titleInner.append("text")
      .attr("x", title.width - title.width/5)
      .attr("y", title.height * 5/8)
      .attr("dominant-baseline", "middle")
      .attr("text-anchor", "end")  // set anchor y justification
      .style("fill", title.color)
      .style('font-size', title.height * .25 + 'px')
      .style("font-weight", "bold")
      .text("Date:")

    titleInner.append("text")
      .attr("x", title.width - title.width/5 + 2*padding)
      .attr("y", title.height * 5/8)
      .attr("dominant-baseline", "middle")
      .style("fill", title.color)
      .style('font-size', title.height * .25 + 'px')
      .text(title.date)

    // Version
    titleInner.append("text")
      .attr("x", title.width - title.width/5)
      .attr("y", title.height * 7/8)
      .attr("dominant-baseline", "middle")
      .attr("text-anchor", "end")  // set anchor y justification
      .style("fill", title.color)
      .style('font-size', title.height * .25 + 'px')
      .style("font-weight", "bold")
      .text("Version:")

    titleInner.append("text")
      .attr("x", title.width - title.width/5 + 2*padding)
      .attr("y", title.height * 7/8)
      .attr("dominant-baseline", "middle")
      .style("fill", title.color)
      .style('font-size', title.height * .25 + 'px')
      .text(title.version)
  }
};
