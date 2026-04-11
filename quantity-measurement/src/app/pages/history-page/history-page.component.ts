import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { HistoryComponent } from '../../components/history/history.component';
import { MeasurementApiType } from '../../config/unit.config';

@Component({
  selector: 'app-history-page',
  standalone: true,
  imports: [CommonModule, HistoryComponent],
  templateUrl: './history-page.component.html',
  styleUrls: ['./history-page.component.scss']
})
export class HistoryPageComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  currentOperation: string = 'compare';
  currentMeasurementType: MeasurementApiType = 'LengthUnit';

  ngOnInit(): void {
    // Get query params from navigation
    this.route.queryParams.subscribe(params => {
      this.currentOperation = params['operation'] || 'compare';
      this.currentMeasurementType = params['type'] || 'LengthUnit';
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
