<?php

function DisplayCharts()
{
  global $pageHeaderTitle, $pageIcon;
?>
  <script src="/js/highcharts/code/highcharts.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
  <script src="/js/highcharts/code/highcharts-more.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
  <script src="/js/highcharts/code/highcharts-3d.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
  <script src="/js/highcharts/code/modules/series-label.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
  <script src="/js/highcharts/code/modules/solid-gauge.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
  <script src="/js/highcharts/code/modules/no-data-to-display.js"></script>

  <link rel="stylesheet" href="/css/charts.css?c=<?php echo ALLSKY_VERSION; ?>" />  
  <script src="/js/jquery-chart/jquery-chart.js?c=<?php echo ALLSKY_VERSION; ?>"></script>
  <script src="/js/charts.js?c=<?php echo ALLSKY_VERSION; ?>"></script>  

  <div class="panel panel-allsky noselect">
    <div class="panel-heading clearfix">
      <div class="pull-left">
        <i class="<?php echo $pageIcon ?>"></i> <?php echo $pageHeaderTitle ?>
      </div>

      <div class="pull-right">
        <button type="button" id="as-charts-menu" class="btn btn-default btn-xs">
          <i class="fa fa-bars"></i>
        </button>
      </div>
    </div>

    <div class="panel-body">

      <ul class="nav nav-tabs" id="as-gm-tablist">
        <li class="active">
          <a href="#as-gm-tab-1" data-toggle="tab">
            <span class="tab-title">Home</span>
          </a>
        </li>
        <li id="as-gm-add-tab">
          <a href="javascript:void(0);"><span class="fa fa-plus"></span></a>
        </li>
      </ul>

      <div class="tab-content" id="as-gm-tablist-content">
        <div class="tab-pane fade in active as-gm-tab" id="as-gm-tab-1">
        </div>
      </div>



    </div>
  </div>

  <script>
    let chartManager = new ASCHARTMANAGER();
  </script>

<?php
}
?>