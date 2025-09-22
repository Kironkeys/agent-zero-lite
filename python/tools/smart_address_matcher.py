#!/usr/bin/env python3
"""
Smart address matching without external dependencies.
Uses blocking strategies to handle large datasets efficiently.
"""

import pandas as pd
from difflib import SequenceMatcher
import time
import sys
from collections import defaultdict
from pathlib import Path

class SmartAddressMatcher:
    """Efficient address matching using smart blocking strategies."""
    
    def __init__(self, file1_path, file2_path, output_path=None):
        self.file1_path = file1_path
        self.file2_path = file2_path
        self.output_path = output_path or "matched_addresses.csv"
        
    def load_data(self):
        """Load and prepare data."""
        print("Loading files...")
        self.df1 = pd.read_csv(self.file1_path)
        self.df2 = pd.read_csv(self.file2_path)
        
        print(f"File 1: {len(self.df1):,} records")
        print(f"File 2: {len(self.df2):,} records")
        
        # Prepare address columns
        self._prepare_addresses()
        
    def _prepare_addresses(self):
        """Clean and prepare address columns."""
        
        # File 1 addresses
        if 'property_address' in self.df1.columns:
            self.df1['clean_address'] = self.df1['property_address']
        else:
            addr_col = next((c for c in self.df1.columns if 'address' in c.lower()), None)
            if addr_col:
                self.df1['clean_address'] = self.df1[addr_col]
        
        # Clean file 1
        self.df1['clean_address'] = (self.df1['clean_address']
                                     .fillna('')
                                     .str.lower()
                                     .str.strip())
        
        # File 2 addresses
        if 'Site Address' in self.df2.columns:
            self.df2['clean_address'] = (
                self.df2['Site Address'].fillna('') + ' ' +
                self.df2.get('Site City', '').fillna('') + ', ' +
                self.df2.get('Site State', '').fillna('') + ' ' +
                self.df2.get('Site Zip Code', '').fillna('').astype(str)
            )
        else:
            addr_col = next((c for c in self.df2.columns if 'address' in c.lower()), None)
            if addr_col:
                self.df2['clean_address'] = self.df2[addr_col]
        
        # Clean file 2
        self.df2['clean_address'] = (self.df2['clean_address']
                                     .fillna('')
                                     .str.lower()
                                     .str.strip())
        
        # Extract blocking keys
        self._extract_blocking_keys()
    
    def _extract_blocking_keys(self):
        """Extract keys for blocking strategy."""
        
        # Extract ZIP codes
        self.df1['zip'] = self.df1['clean_address'].str.extract(r'(\d{5})', expand=False)
        self.df2['zip'] = self.df2['clean_address'].str.extract(r'(\d{5})', expand=False)
        
        # Extract street numbers
        self.df1['street_num'] = self.df1['clean_address'].str.extract(r'^(\d+)', expand=False)
        self.df2['street_num'] = self.df2['clean_address'].str.extract(r'^(\d+)', expand=False)
        
        # Extract first word (often street number)
        self.df1['first_word'] = self.df1['clean_address'].str.split().str[0]
        self.df2['first_word'] = self.df2['clean_address'].str.split().str[0]
        
        # Create street name (second and third words)
        self.df1['street_name'] = self.df1['clean_address'].str.split().str[1:3].str.join(' ')
        self.df2['street_name'] = self.df2['clean_address'].str.split().str[1:3].str.join(' ')
    
    def match_with_blocking(self, threshold=0.8, max_comparisons=1000000):
        """
        Match addresses using blocking to reduce comparisons.
        
        Args:
            threshold: Minimum similarity score (0-1)
            max_comparisons: Maximum comparisons to prevent runaway
        """
        
        print("\n=== SMART ADDRESS MATCHING ===")
        
        # Calculate theoretical comparisons
        total_possible = len(self.df1) * len(self.df2)
        print(f"Without blocking: {total_possible:,} comparisons")
        
        if total_possible > max_comparisons:
            print(f"⚠️  Too many comparisons! Using blocking strategy...")
        
        matches = []
        comparisons_made = 0
        start_time = time.time()
        
        # Strategy 1: Exact ZIP code matching (fastest)
        if 'zip' in self.df1.columns and self.df1['zip'].notna().any():
            print("\n📍 Strategy 1: ZIP code blocking")
            zip_matches, zip_comparisons = self._match_by_zip(threshold)
            matches.extend(zip_matches)
            comparisons_made += zip_comparisons
            print(f"  Found {len(zip_matches)} matches with {zip_comparisons:,} comparisons")
        
        # Strategy 2: Street number blocking (for remaining)
        if comparisons_made < max_comparisons and len(matches) < len(self.df1) * 0.5:
            print("\n🏠 Strategy 2: Street number blocking")
            street_matches, street_comparisons = self._match_by_street_number(
                threshold, 
                max_comparisons - comparisons_made,
                exclude_indices=set(m[0] for m in matches)
            )
            matches.extend(street_matches)
            comparisons_made += street_comparisons
            print(f"  Found {len(street_matches)} additional matches with {street_comparisons:,} comparisons")
        
        # Strategy 3: Sample matching for verification
        if comparisons_made < max_comparisons and len(matches) < 100:
            print("\n🔍 Strategy 3: Random sampling (last resort)")
            sample_matches, sample_comparisons = self._match_sample(
                threshold,
                min(10000, max_comparisons - comparisons_made)
            )
            matches.extend(sample_matches)
            comparisons_made += sample_comparisons
            print(f"  Found {len(sample_matches)} additional matches")
        
        elapsed = time.time() - start_time
        
        print(f"\n✅ Matching completed!")
        print(f"  Time: {elapsed:.2f} seconds")
        print(f"  Total comparisons: {comparisons_made:,} ({comparisons_made/total_possible*100:.2f}% of total)")
        print(f"  Matches found: {len(matches)}")
        
        return matches
    
    def _match_by_zip(self, threshold):
        """Match addresses within same ZIP codes."""
        matches = []
        comparisons = 0
        
        # Group by ZIP
        df1_by_zip = self.df1.groupby('zip')
        df2_by_zip = self.df2.groupby('zip')
        
        common_zips = set(self.df1['zip'].dropna()) & set(self.df2['zip'].dropna())
        
        for zip_code in common_zips:
            if pd.isna(zip_code):
                continue
                
            group1 = df1_by_zip.get_group(zip_code)
            group2 = df2_by_zip.get_group(zip_code)
            
            # Only compare if groups are reasonable size
            if len(group1) * len(group2) > 10000:
                continue
            
            for idx1, row1 in group1.iterrows():
                for idx2, row2 in group2.iterrows():
                    comparisons += 1
                    
                    similarity = self._calculate_similarity(
                        row1['clean_address'], 
                        row2['clean_address']
                    )
                    
                    if similarity >= threshold:
                        matches.append((idx1, idx2, similarity))
        
        return matches, comparisons
    
    def _match_by_street_number(self, threshold, max_comparisons, exclude_indices):
        """Match addresses with same street number."""
        matches = []
        comparisons = 0
        
        # Group by street number
        df1_filtered = self.df1[~self.df1.index.isin(exclude_indices)]
        df1_by_num = df1_filtered.groupby('street_num')
        df2_by_num = self.df2.groupby('street_num')
        
        common_nums = set(df1_filtered['street_num'].dropna()) & set(self.df2['street_num'].dropna())
        
        for street_num in common_nums:
            if pd.isna(street_num) or comparisons >= max_comparisons:
                break
                
            group1 = df1_by_num.get_group(street_num)
            group2 = df2_by_num.get_group(street_num)
            
            # Limit group size
            if len(group1) * len(group2) > 1000:
                continue
            
            for idx1, row1 in group1.iterrows():
                for idx2, row2 in group2.iterrows():
                    comparisons += 1
                    
                    similarity = self._calculate_similarity(
                        row1['clean_address'], 
                        row2['clean_address']
                    )
                    
                    if similarity >= threshold:
                        matches.append((idx1, idx2, similarity))
                    
                    if comparisons >= max_comparisons:
                        return matches, comparisons
        
        return matches, comparisons
    
    def _match_sample(self, threshold, sample_size):
        """Match a random sample as last resort."""
        matches = []
        comparisons = 0
        
        # Take random samples
        sample1 = self.df1.sample(min(100, len(self.df1)))
        sample2 = self.df2.sample(min(100, len(self.df2)))
        
        for idx1, row1 in sample1.iterrows():
            for idx2, row2 in sample2.iterrows():
                comparisons += 1
                
                similarity = self._calculate_similarity(
                    row1['clean_address'], 
                    row2['clean_address']
                )
                
                if similarity >= threshold:
                    matches.append((idx1, idx2, similarity))
                
                if comparisons >= sample_size:
                    return matches, comparisons
        
        return matches, comparisons
    
    def _calculate_similarity(self, addr1, addr2):
        """Calculate similarity between two addresses."""
        return SequenceMatcher(None, addr1, addr2).ratio()
    
    def save_results(self, matches):
        """Save matches to CSV."""
        
        results = []
        for idx1, idx2, similarity in matches:
            results.append({
                'file1_index': idx1,
                'file1_address': self.df1.loc[idx1, 'clean_address'],
                'file2_index': idx2,
                'file2_address': self.df2.loc[idx2, 'clean_address'],
                'similarity': round(similarity, 3)
            })
        
        results_df = pd.DataFrame(results)
        results_df.to_csv(self.output_path, index=False)
        
        print(f"\n📁 Results saved to: {self.output_path}")
        
        # Statistics
        pct1 = (len(set(m[0] for m in matches)) / len(self.df1)) * 100
        pct2 = (len(set(m[1] for m in matches)) / len(self.df2)) * 100
        
        print(f"\n📊 Match Statistics:")
        print(f"  {pct1:.1f}% of File 1 addresses matched")
        print(f"  {pct2:.1f}% of File 2 addresses matched")
        
        return results_df


def main():
    """Command-line interface."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Smart Address Matcher - Efficiently match addresses between large CSV files'
    )
    parser.add_argument('file1', help='First CSV file path')
    parser.add_argument('file2', help='Second CSV file path')
    parser.add_argument('output', nargs='?', default='matched_addresses.csv',
                       help='Output CSV file path (default: matched_addresses.csv)')
    parser.add_argument('--threshold', type=float, default=0.8,
                       help='Similarity threshold 0-1 (default: 0.8)')
    parser.add_argument('--max-comparisons', type=int, default=1000000,
                       help='Maximum comparisons to prevent runaway (default: 1000000)')
    
    args = parser.parse_args()
    
    # Validate files exist
    if not Path(args.file1).exists():
        print(f"Error: File not found: {args.file1}")
        sys.exit(1)
    if not Path(args.file2).exists():
        print(f"Error: File not found: {args.file2}")
        sys.exit(1)
    
    # Run matching
    matcher = SmartAddressMatcher(args.file1, args.file2, args.output)
    matcher.load_data()
    matches = matcher.match_with_blocking(
        threshold=args.threshold,
        max_comparisons=args.max_comparisons
    )
    matcher.save_results(matches)


if __name__ == "__main__":
    main()