<?php

function DisplayCharts() {

}

?>
<script src="/js/highcharts/code/highcharts.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
<script src="/js/highcharts/code/highcharts-more.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
<script src="/js/highcharts/code/modules/series-label.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
<script src="/js/highcharts/code/modules/no-data-to-display.js"></script> 
<script src="js/charts.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
<link rel="stylesheet" href="/css/charts.css?c=<?php echo ALLSKY_VERSION; ?>" />

<div id="allsky-charts-sidebar" class="panel-group">
  <div id="allsky-charts-sidebar-title">
    <i class="fa fa-bar-chart"></i> Available Graphs
  </div>
</div>

<nav class="navbar navbar-default allsky-charts-navbar">              
  <div class="collapse navbar-collapse" id="oe-module-editor-navbar">
      <ul class="nav navbar-nav">
          <li>
            <button id="allsky-charts-chart-list-toggle" type="button" class="btn btn-primary navbar-btn fix-toggle-btn">
              <span class="label label-default" id="allsky-charts-chart-list-toggle-label">OFF</span> Charts
            </button>
          </li>            
          <li>
              <div class="btn navbar-btn ml-1" id="allsky-charts-lock" data-toggle="tooltip" data-placement="top" data-container="body" title="lock/unlock drag and drop">
                <i class="fa-solid fa-lock-open" id="allsky-charts-chart-toggle-lock"></i>
              </div>
          </li>
      </ul>
      <ul class="nav navbar-nav navbar-right">
      </ul> 
  </div>
</nav>

<ul class="nav nav-tabs mt-3" id="allsky-charts-tabbar">
  <li class="custom-tab active">
    <a href="#tab1" data-toggle="tab">
      <span class="tab-title" contenteditable="false">Tab 1</span>
    </a>
  </li>
  <li id="add-tab-btn"><a href="#"><i class="fa-solid fa-square-plus"></i></a></li>
</ul>

<div class="tab-content" id="allsky-charts-main">
  <div id="tab1" class="tab-pane fade in active"></div>
</div>
<div id="container"></div>
<div id="allsky-charts-main"></div>