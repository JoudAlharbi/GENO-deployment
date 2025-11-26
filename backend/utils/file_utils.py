import os
import uuid
import pandas as pd
from werkzeug.utils import secure_filename
from config import Config

class FileHandler:
    
    # Allowed DNA file extensions
    ALLOWED_EXTENSIONS = {'fasta', 'fa', 'fastq', 'fq', 'vcf', 'csv', 'txt', 'ab1'}
    
    @staticmethod
    def allowed_file(filename):
        """Check if file extension is allowed"""
        return '.' in filename and \
               filename.rsplit('.', 1)[1].lower() in FileHandler.ALLOWED_EXTENSIONS
    
    @staticmethod
    def generate_file_id():
        """Generate unique file ID"""
        return f"DNA-{uuid.uuid4().hex[:12].upper()}"
    
    @staticmethod
    def get_file_extension(filename):
        """Extract file extension"""
        return filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
    
    @staticmethod
    def save_uploaded_file(file, user_id):
        """
        Save uploaded file to disk
        Returns: dict with file_id, filepath, original_name, size
        """
        if not file or file.filename == '':
            return {'error': 'No file provided'}
        
        if not FileHandler.allowed_file(file.filename):
            return {'error': 'File type not allowed'}
        
        # Generate unique file ID
        file_id = FileHandler.generate_file_id()
        
        # Secure the filename
        original_filename = secure_filename(file.filename)
        extension = FileHandler.get_file_extension(original_filename)
        
        # Create new filename: FileID.extension
        new_filename = f"{file_id}.{extension}"
        
        # Create user-specific directory
        user_folder = os.path.join(Config.UPLOAD_FOLDER, user_id)
        os.makedirs(user_folder, exist_ok=True)
        
        # Full file path
        filepath = os.path.join(user_folder, new_filename)
        
        # Save file
        file.save(filepath)
        
        # Get file size
        file_size = os.path.getsize(filepath)
        
        return {
            'file_id': file_id,
            'filepath': filepath,
            'original_name': original_filename,
            'stored_name': new_filename,
            'size': file_size,
            'extension': extension
        }
    
    @staticmethod
    def get_file_info(filepath):
        """Get information about a stored file"""
        if not os.path.exists(filepath):
            return None
        
        return {
            'exists': True,
            'size': os.path.getsize(filepath),
            'path': filepath
        }
    
    @staticmethod
    def delete_file(filepath):
        """Delete a file from storage"""
        try:
            if os.path.exists(filepath):
                os.remove(filepath)
                return True
            return False
        except Exception as e:
            print(f"Error deleting file: {e}")
            return False
    
    @staticmethod
    def read_file_content(filepath, max_lines=100):
        """
        Read file content (for preview)
        Returns first max_lines of the file
        """
        try:
            with open(filepath, 'r') as f:
                lines = []
                for i, line in enumerate(f):
                    if i >= max_lines:
                        break
                    lines.append(line.rstrip())
                return {
                    'success': True,
                    'lines': lines,
                    'total_lines': i + 1
                }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    @staticmethod
    def validate_fasta_format(filepath):
        """Basic validation for FASTA file format"""
        try:
            with open(filepath, 'r') as f:
                first_line = f.readline().strip()
                if not first_line.startswith('>'):
                    return {
                        'valid': False,
                        'error': 'FASTA file must start with >'
                    }
                
                # Check for sequence lines
                sequence_found = False
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('>'):
                        # Check if line contains valid DNA characters
                        valid_chars = set('ATGCNatgcn-')
                        if all(c in valid_chars for c in line):
                            sequence_found = True
                            break
                
                if not sequence_found:
                    return {
                        'valid': False,
                        'error': 'No valid DNA sequence found'
                    }
                
                return {'valid': True}
                
        except Exception as e:
            return {
                'valid': False,
                'error': str(e)
            }
    
    @staticmethod
    def get_sequence_stats(filepath):
        """Get basic statistics about DNA sequence file (FASTA format)"""
        try:
            stats = {
                'total_sequences': 0,
                'total_bases': 0,
                'gc_content': 0
            }
            
            with open(filepath, 'r') as f:
                current_sequence = ''
                gc_count = 0
                
                for line in f:
                    line = line.strip()
                    
                    if line.startswith('>'):
                        # New sequence header
                        if current_sequence:
                            stats['total_bases'] += len(current_sequence)
                            gc_count += current_sequence.upper().count('G') + \
                                       current_sequence.upper().count('C')
                            current_sequence = ''
                        stats['total_sequences'] += 1
                    else:
                        # Sequence line
                        current_sequence += line
                
                # Handle last sequence
                if current_sequence:
                    stats['total_bases'] += len(current_sequence)
                    gc_count += current_sequence.upper().count('G') + \
                               current_sequence.upper().count('C')
                
                # Calculate GC content
                if stats['total_bases'] > 0:
                    stats['gc_content'] = round((gc_count / stats['total_bases']) * 100, 2)
            
            return stats
            
        except Exception as e:
            return {'error': str(e)}
    
    @staticmethod
    def validate_csv_format(filepath):
        """Validate CSV/TSV file format for gene expression matrix"""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                # Read first line to check for sample IDs
                first_line = f.readline().strip()
                if not first_line:
                    return {
                        'valid': False,
                        'error': 'File is empty'
                    }
                
                # Check if tab-separated (most likely for gene expression data)
                delimiter = '\t' if '\t' in first_line else ','
                sample_ids = first_line.split(delimiter)
                
                if len(sample_ids) < 2:
                    return {
                        'valid': False,
                        'error': 'File must contain at least one sample column'
                    }
                
                # For gene expression files, first row contains sample IDs
                # First column might be empty or contain a label like "Gene" or "GeneID"
                # We'll check the data rows for ENSG gene IDs
                
                # Read a few more lines to validate gene ID format
                gene_id_found = False
                line_count = 0
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    
                    parts = line.split(delimiter)
                    if len(parts) < 2:
                        continue
                    
                    gene_id = parts[0].strip()
                    # Check if it's an ENSEMBL gene ID
                    if gene_id.startswith('ENSG'):
                        gene_id_found = True
                        # Validate that remaining columns are numeric
                        try:
                            for val in parts[1:]:
                                if val.strip():  # Skip empty values
                                    float(val.strip())
                        except ValueError:
                            return {
                                'valid': False,
                                'error': f'Non-numeric value found in count data: {val}'
                            }
                    
                    line_count += 1
                    if line_count >= 10:  # Check first 10 data rows
                        break
                
                if not gene_id_found:
                    return {
                        'valid': False,
                        'error': 'No ENSEMBL gene IDs (ENSG...) found in first column'
                    }
                
                return {'valid': True}
                
        except UnicodeDecodeError:
            return {
                'valid': False,
                'error': 'File encoding error - file may not be text format'
            }
        except Exception as e:
            return {
                'valid': False,
                'error': str(e)
            }
    
    @staticmethod
    def parse_csv_data(filepath):
        """Parse CSV/TSV gene expression data"""
        try:
            # Detect delimiter
            with open(filepath, 'r', encoding='utf-8') as f:
                first_line = f.readline()
                delimiter = '\t' if '\t' in first_line else ','
            
            # Read CSV with pandas
            df = pd.read_csv(filepath, sep=delimiter, index_col=0, dtype=str)
            
            # Convert count columns to numeric
            for col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')
            
            # Get statistics
            stats = {
                'num_genes': len(df),
                'num_samples': len(df.columns),
                'sample_ids': list(df.columns),
                'gene_ids': list(df.index)[:10],  # First 10 gene IDs as sample
                'total_data_points': df.size,
                'missing_values': int(df.isna().sum().sum()),
                'min_value': float(df.min().min()) if not df.empty else 0,
                'max_value': float(df.max().max()) if not df.empty else 0,
                'mean_value': float(df.mean().mean()) if not df.empty else 0
            }
            
            return {
                'success': True,
                'data': df,
                'stats': stats
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    @staticmethod
    def get_csv_stats(filepath):
        """Get statistics about CSV gene expression file"""
        result = FileHandler.parse_csv_data(filepath)
        if result['success']:
            return result['stats']
        else:
            return {'error': result['error']}