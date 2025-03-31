<?php

function DisplayCharts() {

}

?>
<script src="js/charts.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
<script src="https://cdn.jsdelivr.net/npm/echarts/dist/echarts.min.js"></script>
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
        <li>
          <div class="btn navbar-btn ml-2" id="allsky-charts-clear" data-toggle="tooltip" data-placement="top" data-container="body" title="Delete all charts">
            <i class="fa-solid fa-trash-can"></i>
          </div>
        </li>
      </ul> 
  </div>
</nav>


  <div id="allsky-charts-main"></div>