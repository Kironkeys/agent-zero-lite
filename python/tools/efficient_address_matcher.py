#!/usr/bin/env python3
"""
Efficient address matching tool for large datasets.
Uses blocking and record linkage techniques to handle 40k+ records efficiently.
"""

import pandas as pd
import recordlinkage
from recordlinkage.preprocessing import clean
import time
import sys
from pathlib import Path

class EfficientAddressMatcher:
    """Handles large-scale address matching efficiently using blocking."""
    
    def __init__(self, file1_path, file2_path, output_path=None):
        self.file1_path = file1_path
        self.file2_path = file2_path
        self.output_path = output_path or "matched_addresses.csv"
        
    def load_and_clean_data(self):
        """Load CSV files and prepare address columns."""
        print(f"Loading files...")
        
        # Load datasets
        self.df1 = pd.read_csv(self.file1_path)
        self.df2 = pd.read_csv(self.file2_path)
        
        print(f"File 1: {len(self.df1)} records")
        print(f"File 2: {len(self.df2)} records")
        
        # Standardize address columns for file 1
        if 'property_address' in self.df1.columns:
            self.df1['clean_address'] = self.df1['property_address'].fillna('').str.lower().str.strip()
        else:
            # Find the address column
            addr_cols = [c for c in self.df1.columns if 'address' in c.lower()]
            if addr_cols:
                self.df1['clean_address'] = self.df1[addr_cols[0]].fillna('').str.lower().str.strip()
        
        # Standardize address columns for file 2
        if 'Site Address' in self.df2.columns:
            # Combine address components
            self.df2['clean_address'] = (
                self.df2['Site Address'].fillna('') + ' ' +
                self.df2.get('Site City', '').fillna('') + ' ' +
                self.df2.get('Site State', '').fillna('') + ' ' +
                self.df2.get('Site Zip Code', '').fillna('').astype(str)
            ).str.lower().str.strip()
        else:
            addr_cols = [c for c in self.df2.columns if 'address' in c.lower()]
            if addr_cols:
                self.df2['clean_address'] = self.df2[addr_cols[0]].fillna('').str.lower().str.strip()
        
        # Extract zip codes for blocking
        self.df1['zip'] = self.df1['clean_address'].str.extract(r'(\d{5})')
        self.df2['zip'] = self.df2['clean_address'].str.extract(r'(\d{5})')
        
        # Extract street numbers for additional blocking
        self.df1['street_num'] = self.df1['clean_address'].str.extract(r'^(\d+)')
        self.df2['street_num'] = self.df2['clean_address'].str.extract(r'^(\d+)')
        
        return self.df1, self.df2
    
    def match_addresses_efficiently(self, threshold=0.8):
        """Match addresses using blocking to reduce comparisons."""
        
        print("\n=== EFFICIENT ADDRESS MATCHING ===")
        
        # Calculate theoretical comparisons without blocking
        total_comparisons = len(self.df1) * len(self.df2)
        print(f"Without blocking: {total_comparisons:,} comparisons needed")
        
        # Create indexer with multiple blocking strategies
        indexer = recordlinkage.Index()
        
        # Strategy 1: Block on zip code (if available)
        if self.df1['zip'].notna().any() and self.df2['zip'].notna().any():
            indexer.block('zip')
            print("Using ZIP code blocking")
        
        # Strategy 2: Block on first 3 characters of street number
        elif self.df1['street_num'].notna().any() and self.df2['street_num'].notna().any():
            indexer.block('street_num')
            print("Using street number blocking")
        
        # Strategy 3: Sorted neighborhood on address (sliding window)
        else:
            indexer.sortedneighbourhood('clean_address', window=5)
            print("Using sorted neighborhood blocking (window=5)")
        
        # Generate candidate pairs
        print("\nGenerating candidate pairs...")
        start_time = time.time()
        candidate_pairs = indexer.index(self.df1, self.df2)
        
        actual_comparisons = len(candidate_pairs)
        reduction_pct = (1 - actual_comparisons/total_comparisons) * 100
        
        print(f"With blocking: {actual_comparisons:,} comparisons")
        print(f"Reduction: {reduction_pct:.1f}% fewer comparisons!")
        
        # Compare the candidate pairs
        print("\nComparing addresses...")
        comparer = recordlinkage.Compare()
        
        # Use multiple comparison methods
        comparer.string('clean_address', 'clean_address', 
                       method='levenshtein', threshold=threshold, 
                       label='address_similarity')
        
        # If we have components, compare them too
        if 'Site City' in self.df2.columns:
            comparer.exact('city', 'Site City', label='city_match')
        
        if 'zip' in self.df1.columns and 'zip' in self.df2.columns:
            comparer.exact('zip', 'zip', label='zip_match')
        
        # Compute similarities
        features = comparer.compute(candidate_pairs, self.df1, self.df2)
        
        # Find matches (sum score >= 1 means at least one field matches well)
        matches = features[features.sum(axis=1) >= 1.0]
        
        elapsed = time.time() - start_time
        print(f"\nMatching completed in {elapsed:.2f} seconds")
        print(f"Found {len(matches):,} potential matches")
        
        return matches, features
    
    def save_results(self, matches):
        """Save matched addresses to CSV."""
        
        # Get the matched records
        matched_records = []
        
        for idx1, idx2 in matches.index:
            record = {
                'file1_address': self.df1.loc[idx1, 'clean_address'],
                'file2_address': self.df2.loc[idx2, 'clean_address'],
                'file1_index': idx1,
                'file2_index': idx2,
            }
            
            # Add original data if needed
            if 'owner_name' in self.df1.columns:
                record['owner_name'] = self.df1.loc[idx1, 'owner_name']
            
            matched_records.append(record)
        
        # Save to CSV
        results_df = pd.DataFrame(matched_records)
        results_df.to_csv(self.output_path, index=False)
        
        print(f"\nResults saved to: {self.output_path}")
        
        # Calculate match statistics
        pct_from_file1 = (len(matches) / len(self.df1)) * 100
        pct_from_file2 = (len(matches) / len(self.df2)) * 100
        
        print(f"\nMatch Statistics:")
        print(f"- {pct_from_file1:.1f}% of File 1 addresses found matches")
        print(f"- {pct_from_file2:.1f}% of File 2 addresses found matches")
        
        return results_df


def main():
    """Main function for command-line usage."""
    if len(sys.argv) < 3:
        print("Usage: python efficient_address_matcher.py file1.csv file2.csv [output.csv]")
        sys.exit(1)
    
    file1 = sys.argv[1]
    file2 = sys.argv[2]
    output = sys.argv[3] if len(sys.argv) > 3 else None
    
    # Check if recordlinkage is installed
    try:
        import recordlinkage
    except ImportError:
        print("ERROR: recordlinkage library not installed!")
        print("Install with: pip install recordlinkage")
        sys.exit(1)
    
    # Run the matching
    matcher = EfficientAddressMatcher(file1, file2, output)
    matcher.load_and_clean_data()
    matches, features = matcher.match_addresses_efficiently()
    matcher.save_results(matches)


if __name__ == "__main__":
    main()